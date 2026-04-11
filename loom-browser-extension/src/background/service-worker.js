import { extractKnowledge } from '../utils/ai.js';
import {
  addConnection,
  addEvent,
  clearAllData,
  getAllNodes,
  getGraphSnapshot,
  getNodeDetail,
  getRecentNudgesCount,
  hasNudgedPair,
  runWeeklyPruning,
  updateConnectionFlags,
  upsertEdge,
  upsertNode,
} from '../utils/graph-db.js';
import { buildTopConnectionCandidates, classifyConnection } from '../utils/connectionEngine.js';
import {
  DEFAULT_SETTINGS,
  getDailyUsageCount,
  getSettings,
  incrementDailyUsageCount,
  isExcludedDomain,
  isWithinQuietHours,
  updateSettings,
} from '../utils/settings.js';
import { DAY3_ALARM, WEEKLY_PRUNE_ALARM, scheduleDay3Reminder, scheduleWeeklyPrune } from '../utils/scheduler.js';

console.log('Loom service worker initialized (Phases 2.1-2.7 backend).');

const AI_COOLDOWN_MS = 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVITY_ITEMS = 50;

const visitQueue = [];
let isProcessingQueue = false;
let lastAiCallAt = 0;
let lastExtractionProvider = 'none';
let lastExtractionStatus = 'idle';
let lastExtractionReason = '';
let lastExtractionAt = 0;

const notificationToConnectionMap = new Map();
const activityLog = [];

function pushActivity(entry) {
  activityLog.unshift({
    id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    ...entry,
  });
  if (activityLog.length > MAX_ACTIVITY_ITEMS) {
    activityLog.length = MAX_ACTIVITY_ITEMS;
  }
}

function getAiStatusMessage() {
  if (lastExtractionStatus === 'ok' && lastExtractionProvider === 'nvidia') {
    return 'AI extraction is active (NVIDIA).';
  }
  if (lastExtractionStatus === 'fallback' || lastExtractionProvider === 'heuristic') {
    return 'AI fallback mode is active (heuristic extraction).';
  }
  if (lastExtractionStatus === 'error') {
    return 'AI extraction failed recently. Use Test AI connection.';
  }
  if (lastExtractionStatus === 'skipped' && lastExtractionReason) {
    return `AI extraction skipped: ${lastExtractionReason.replace(/_/g, ' ')}.`;
  }
  return 'AI is idle. Browse pages to trigger extraction.';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function truncateToTokenBudget(text, maxTokens = 2000) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  return words.slice(0, maxTokens).join(' ');
}

function normalizeVisitPayload(payload) {
  if (!payload || typeof payload.url !== 'string') return null;
  if (!payload.url.startsWith('http://') && !payload.url.startsWith('https://')) return null;

  return {
    id: payload.id || makeId('visit'),
    url: payload.url,
    domain: payload.domain || toDomain(payload.url),
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : payload.url,
    text: truncateToTokenBudget(payload.text || ''),
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    dwellTime: Number(payload.dwellTime || 0),
  };
}

function parseQueryIntent(query) {
  const normalized = String(query || '').toLowerCase();
  if (!normalized.trim()) return { mode: 'topic' };
  if (normalized.includes('this week') || normalized.includes('this-week')) return { mode: 'week' };
  if (normalized.includes('connect') && normalized.includes(' and ')) return { mode: 'path' };
  if (normalized.includes('not revisited') || normalized.includes('haven') || normalized.includes('stale')) {
    return { mode: 'stale' };
  }
  return { mode: 'topic' };
}

function summarizeNodes(nodes, max = 4) {
  return (nodes || []).slice(0, max).map((node) => node.label);
}

function toPopupGraph(snapshot) {
  return {
    nodes: (snapshot.nodes || []).map((node) => ({
      id: node.id,
      url: node.url || '',
      title: node.label,
      visitCount: node.visitCount || 1,
      weight: node.weight || 0,
      type: node.type,
      domain: node.domain || '',
      confidence: Number(node.confidence || 0),
      aiGenerated: Boolean(node.aiGenerated),
      firstVisitedAt: node.firstSeen,
      lastVisitedAt: node.lastSeen,
    })),
    edges: (snapshot.edges || []).map((edge) => ({
      id: `${edge.source} -> ${edge.target}`,
      source: edge.source,
      target: edge.target,
      weight: edge.coOccurrences || 1,
      strength: edge.strength || 0,
      firstTraversedAt: edge.firstSeen,
      lastTraversedAt: edge.lastSeen,
    })),
  };
}

function filterPopupGraph(graph, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return graph;

  const matchedNodeIds = new Set();
  const nodes = (graph.nodes || []).filter((node) => {
    const haystack = `${node.title || ''} ${node.url || ''}`.toLowerCase();
    const isMatch = haystack.includes(normalized);
    if (isMatch) matchedNodeIds.add(node.id);
    return isMatch;
  });

  const edges = (graph.edges || []).filter(
    (edge) => matchedNodeIds.has(edge.source) || matchedNodeIds.has(edge.target)
  );

  return { nodes, edges };
}

function shouldSendNudge(tier, score, settings) {
  if (tier === 'strong') return score >= (settings?.nudgeThreshold || 0.8);
  if (tier === 'medium') return score >= (settings?.nudgeThreshold || 0.8);
  return false;
}

async function notifyConnection({ connection, nodeA, nodeB, settings }) {
  const now = Date.now();

  if (isWithinQuietHours(settings)) return false;

  const nudgesLastHour = await getRecentNudgesCount(now - 60 * 60 * 1000);
  if (nudgesLastHour >= 3) return false;

  if (await hasNudgedPair(connection.pairKey)) return false;

  const notificationId = `loom_connection_${connection.id}`;
  await chrome.notifications.create(notificationId, {
    type: 'basic',
    title: 'Loom noticed a connection',
    iconUrl: 'assets/icons/icon48.png',
    message: `What you're reading about ${nodeA.label} connects to ${nodeB.label} from earlier browsing.`,
    buttons: [{ title: 'Show me' }, { title: 'Dismiss' }],
    priority: 1,
  });

  notificationToConnectionMap.set(notificationId, connection.id);
  await updateConnectionFlags(connection.id, { nudgeSent: true });
  pushActivity({
    type: 'connection',
    title: 'Connection nudge sent',
    detail: `${nodeA.label} ↔ ${nodeB.label}`,
    score: Math.round((connection.score || 0) * 100),
  });

  try {
    chrome.runtime.sendMessage({
      type: 'GRAPH_CONNECTION_ACTIVITY',
      payload: {
        edgeId: `${connection.nodeA} -> ${connection.nodeB}`,
        source: connection.nodeA,
        target: connection.nodeB,
        weight: Math.round(connection.score * 100),
        isNew: true,
        traversedAt: connection.detectedAt,
      },
    });
  } catch {
    // Popup not open.
  }

  return true;
}

async function applyAdaptiveThreshold(connectionId, clicked) {
  const settings = await getSettings();
  const nextThreshold = Math.max(0.65, Math.min(0.95, (settings.nudgeThreshold || 0.8) + (clicked ? -0.02 : 0.02)));
  await updateSettings({ nudgeThreshold: nextThreshold });
  await updateConnectionFlags(connectionId, clicked ? { nudgeClicked: true } : { nudgeDismissed: true });
}

async function processExtractionTask(task) {
  const settings = await getSettings();

  if (!task?.visit) {
    lastExtractionStatus = 'skipped';
    lastExtractionReason = 'invalid_task';
    pushActivity({
      type: 'extraction_skipped',
      title: 'Extraction skipped',
      detail: 'Invalid visit payload.',
      provider: 'none',
    });
    return { ok: false, reason: 'invalid_task' };
  }
  if (task.visit.dwellTime < settings.minDwellTime) {
    lastExtractionStatus = 'skipped';
    lastExtractionReason = 'below_dwell_threshold';
    pushActivity({
      type: 'extraction_skipped',
      title: 'Extraction skipped',
      detail: `${task.visit.domain || 'unknown domain'} (below dwell threshold)`,
      provider: 'none',
    });
    return { ok: false, reason: 'below_dwell_threshold' };
  }
  if (isExcludedDomain(task.visit.domain, settings)) {
    lastExtractionStatus = 'skipped';
    lastExtractionReason = 'excluded_domain';
    pushActivity({
      type: 'extraction_skipped',
      title: 'Extraction skipped',
      detail: `${task.visit.domain || 'unknown domain'} (excluded domain)`,
      provider: 'none',
    });
    return { ok: false, reason: 'excluded_domain' };
  }

  const { count } = await getDailyUsageCount();
  if (count >= settings.dailyApiLimit) {
    lastExtractionStatus = 'skipped';
    lastExtractionReason = 'daily_limit_reached';
    pushActivity({
      type: 'extraction_skipped',
      title: 'Extraction skipped',
      detail: `Daily API limit reached (${settings.dailyApiLimit}).`,
      provider: 'none',
    });
    return { ok: false, reason: 'daily_limit_reached' };
  }

  const cooldownRemaining = Math.max(0, AI_COOLDOWN_MS - (Date.now() - lastAiCallAt));
  if (cooldownRemaining > 0) {
    await sleep(cooldownRemaining);
  }

  const extraction = await extractKnowledge({
    title: task.visit.title,
    domain: task.visit.domain,
    text: task.visit.text,
    apiKey: settings.apiKey,
  });

  lastExtractionProvider = extraction?.provider || 'unknown';
  lastExtractionAt = Date.now();
  lastAiCallAt = Date.now();
  await incrementDailyUsageCount();

  if (extraction?.provider === 'heuristic') {
    lastExtractionStatus = 'fallback';
    lastExtractionReason = 'nvidia_unavailable_or_failed';
  }

  if (!extraction || extraction.confidence < 0.5) {
    lastExtractionStatus = 'skipped';
    lastExtractionReason = 'low_confidence';
    pushActivity({
      type: 'extraction_skipped',
      title: 'Extraction skipped',
      detail: `${task.visit.domain || 'unknown domain'} (${lastExtractionReason.replace(/_/g, ' ')})`,
      provider: extraction?.provider || 'none',
      confidence: Number(extraction?.confidence || 0),
    });
    return { ok: false, reason: 'low_confidence', extraction };
  }

  if (extraction?.provider === 'nvidia') {
    lastExtractionStatus = 'ok';
    lastExtractionReason = '';
  }

  pushActivity({
    type: 'extraction',
    title: extraction?.provider === 'nvidia' ? 'AI extraction complete' : 'Fallback extraction complete',
    detail: `${task.visit.domain || 'unknown domain'} · ${task.visit.title || 'Untitled page'}`,
    provider: extraction?.provider || 'none',
    confidence: Number(extraction?.confidence || 0),
  });

  const event = await addEvent({
    id: task.visit.id,
    url: task.visit.url,
    domain: task.visit.domain,
    title: task.visit.title,
    timestamp: task.visit.timestamp,
    dwellTime: task.visit.dwellTime,
    summary: extraction.summary,
    processed: false,
  });

  const nodesBefore = await getAllNodes();
  const olderNodes = nodesBefore.filter((node) => Date.now() - Number(node.lastSeen || 0) > ONE_DAY_MS);

  const createdNodes = [];
  for (const concept of extraction.concepts || []) {
    const node = await upsertNode({
      label: concept,
      type: 'concept',
      eventId: event.id,
      timestamp: task.visit.timestamp,
      domain: task.visit.domain,
      confidence: extraction.confidence,
      aiGenerated: true,
    });
    if (node) createdNodes.push(node);
  }
  for (const entity of extraction.entities || []) {
    const node = await upsertNode({
      label: entity,
      type: 'entity',
      eventId: event.id,
      timestamp: task.visit.timestamp,
      domain: task.visit.domain,
      confidence: extraction.confidence,
      aiGenerated: true,
    });
    if (node) createdNodes.push(node);
  }
  for (const claim of extraction.claims || []) {
    const node = await upsertNode({
      label: claim,
      type: 'claim',
      eventId: event.id,
      timestamp: task.visit.timestamp,
      domain: task.visit.domain,
      confidence: extraction.confidence,
      aiGenerated: true,
    });
    if (node) createdNodes.push(node);
  }

  const nodeIds = [...new Set(createdNodes.map((node) => node.id))];
  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      await upsertEdge({ source: nodeIds[i], target: nodeIds[j], timestamp: task.visit.timestamp });
    }
  }

  const candidates = buildTopConnectionCandidates(extraction.concepts, olderNodes);
  const topCandidate = candidates[0];
  if (topCandidate && topCandidate.tier !== 'noise') {
    const pairKey = [topCandidate.nodeId, nodeIds[0] || topCandidate.nodeId].sort().join('::');
    const connection = await addConnection({
      pairKey,
      nodeA: topCandidate.nodeId,
      nodeB: nodeIds[0] || topCandidate.nodeId,
      score: topCandidate.score,
      tier: topCandidate.tier,
      explanation: `${topCandidate.concept} relates to ${topCandidate.nodeLabel}`,
      detectedAt: Date.now(),
      nudgeSent: false,
      nudgeDismissed: false,
      nudgeClicked: false,
    });

    pushActivity({
      type: 'connection',
      title: 'Connection detected',
      detail: `${topCandidate.concept} ↔ ${topCandidate.nodeLabel}`,
      score: Math.round((topCandidate.score || 0) * 100),
    });

    if (shouldSendNudge(topCandidate.tier, topCandidate.score, settings)) {
      const currentNode = createdNodes.find((node) => node.id === connection.nodeB) || { label: topCandidate.concept };
      const relatedNode = olderNodes.find((node) => node.id === connection.nodeA) || { label: topCandidate.nodeLabel };
      await notifyConnection({ connection, nodeA: currentNode, nodeB: relatedNode, settings });
    } else if (topCandidate.tier === 'medium') {
      await chrome.action.setBadgeText({ text: '•' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4A9EFF' });
    }
  }

  return {
    ok: true,
    extraction,
    createdNodeCount: nodeIds.length,
  };
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (visitQueue.length) {
    const task = visitQueue.shift();
    try {
      await processExtractionTask(task);
    } catch (error) {
      console.error('Failed processing visit queue task:', error);
    }
  }

  isProcessingQueue = false;
}

function enqueueVisit(visit, sender) {
  pushActivity({
    type: 'visit',
    title: 'Page visited',
    detail: `${visit.domain || 'unknown domain'} · ${visit.title || visit.url}`,
  });
  visitQueue.push({ visit, sender, queuedAt: Date.now() });
  processQueue();
}

async function handlePageVisited(messagePayload, sender) {
  const visit = normalizeVisitPayload(messagePayload);
  if (!visit) return { ok: false, reason: 'invalid_payload' };

  enqueueVisit(visit, sender);
  return { ok: true, queued: true };
}

async function handleGetGraph() {
  const snapshot = await getGraphSnapshot();
  return toPopupGraph(snapshot);
}

async function handleGetActivityLog(payload) {
  const limit = Math.max(1, Math.min(50, Number(payload?.limit || 12)));
  return {
    ok: true,
    items: activityLog.slice(0, limit),
  };
}

async function handleSearchGraph(payload) {
  const graph = await handleGetGraph();
  const filtered = filterPopupGraph(graph, payload?.query);
  return {
    ok: true,
    graph: filtered,
    query: typeof payload?.query === 'string' ? payload.query : '',
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
  };
}

async function handleGetNodeDetail(payload) {
  const detail = await getNodeDetail(payload?.nodeId);
  if (!detail) return { ok: false, reason: 'not_found' };
  return { ok: true, ...detail };
}

async function handleQueryGraph(payload) {
  const query = String(payload?.query || '').trim();
  const intent = parseQueryIntent(query);
  const snapshot = await getGraphSnapshot();

  if (intent.mode === 'week') {
    const cutoff = Date.now() - 7 * ONE_DAY_MS;
    const weekNodes = snapshot.nodes.filter((node) => Number(node.lastSeen || 0) >= cutoff);
    return {
      ok: true,
      mode: 'week',
      summary: `In the last 7 days you revisited ${weekNodes.length} concepts/entities/claims. Based on ${weekNodes.length} nodes you've read on this topic.`,
      graph: toPopupGraph({ nodes: weekNodes, edges: snapshot.edges }),
      sources: weekNodes.map((node) => ({ id: node.id, label: node.label, lastSeen: node.lastSeen })),
    };
  }

  if (intent.mode === 'stale') {
    const staleCutoff = Date.now() - 14 * ONE_DAY_MS;
    const staleNodes = snapshot.nodes
      .filter((node) => Number(node.lastSeen || 0) < staleCutoff)
      .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
      .slice(0, 12);

    return {
      ok: true,
      mode: 'stale',
      summary: `You have ${staleNodes.length} high-value topics not revisited recently. Based on ${staleNodes.length} nodes you've read on this topic.`,
      graph: toPopupGraph({ nodes: staleNodes, edges: snapshot.edges }),
      sources: staleNodes.map((node) => ({ id: node.id, label: node.label, weight: node.weight })),
    };
  }

  const matchedNodes = snapshot.nodes.filter((node) =>
    `${node.label} ${node.normalizedLabel}`.toLowerCase().includes(query.toLowerCase())
  );

  if (!matchedNodes.length) {
    return {
      ok: true,
      mode: 'topic',
      summary: `I could not find enough reading history for "${query}" yet. Based on 0 pages you've read on this topic.`,
      graph: { nodes: [], edges: [] },
      sources: [],
    };
  }

  const labels = summarizeNodes(matchedNodes, 3).join(', ');
  return {
    ok: true,
    mode: 'topic',
    summary: `Your recent reading covers ${labels}. Based on ${matchedNodes.length} pages you've read on this topic.`,
    graph: toPopupGraph({ nodes: matchedNodes, edges: snapshot.edges }),
    sources: matchedNodes.map((node) => ({ id: node.id, label: node.label, lastSeen: node.lastSeen })),
  };
}

async function handleClearGraph() {
  await clearAllData();
  await chrome.action.setBadgeText({ text: '' });
  activityLog.length = 0;
  return { ok: true, cleared: true };
}

async function handleGetBackendHealth() {
  const settings = await getSettings();
  const { count } = await getDailyUsageCount();

  return {
    ok: true,
    queueLength: visitQueue.length,
    isProcessingQueue,
    lastAiCallAt,
    aiCooldownMs: AI_COOLDOWN_MS,
    dailyUsage: count,
    dailyLimit: settings.dailyApiLimit,
    nudgeThreshold: settings.nudgeThreshold,
    hasApiKey: Boolean(settings.apiKey),
    lastExtractionProvider,
    lastExtractionStatus,
    lastExtractionReason,
    lastExtractionAt,
    aiStatusMessage: getAiStatusMessage(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

async function handleTestAiConnection() {
  const settings = await getSettings();
  if (!settings.apiKey) {
    return { ok: false, reason: 'missing_api_key', message: 'Add your NVIDIA API key in Settings first.' };
  }

  try {
    const result = await extractKnowledge({
      title: 'Loom AI health check',
      domain: 'loom.local',
      text: 'Neural networks, reinforcement learning, graph embeddings, and knowledge discovery are related topics.',
      apiKey: settings.apiKey,
    });

    lastExtractionProvider = result?.provider || 'unknown';
    lastExtractionAt = Date.now();
    lastExtractionStatus = result?.provider === 'nvidia' ? 'ok' : 'fallback';
    lastExtractionReason = result?.provider === 'nvidia' ? '' : 'nvidia_unavailable_or_failed';

    return {
      ok: result?.provider === 'nvidia',
      provider: result?.provider || 'unknown',
      confidence: Number(result?.confidence || 0),
      message:
        result?.provider === 'nvidia'
          ? 'NVIDIA AI connection is working.'
          : 'NVIDIA call failed and fallback mode was used.',
    };
  } catch (error) {
    lastExtractionStatus = 'error';
    lastExtractionReason = 'test_failed';
    lastExtractionAt = Date.now();
    return {
      ok: false,
      reason: 'test_failed',
      message: error?.message || 'AI connection test failed.',
    };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!settings.installDate) {
    const installDate = Date.now();
    await updateSettings({ ...DEFAULT_SETTINGS, ...settings, installDate });
    await scheduleDay3Reminder(installDate);
  }

  await scheduleWeeklyPrune();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === DAY3_ALARM) {
    await chrome.notifications.create('loom_day3', {
      type: 'basic',
      title: 'Loom is ready to connect your ideas',
      message: 'Come back to see what Loom noticed across your browsing history.',
      iconUrl: 'assets/icons/icon48.png',
      priority: 1,
    });

    await updateSettings({ day3NotificationSent: true });
    return;
  }

  if (alarm.name === WEEKLY_PRUNE_ALARM) {
    await runWeeklyPruning();
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const connectionId = notificationToConnectionMap.get(notificationId);
  if (!connectionId) return;

  if (buttonIndex === 0) {
    await applyAdaptiveThreshold(connectionId, true);
  } else {
    await applyAdaptiveThreshold(connectionId, false);
  }
});

chrome.notifications.onClosed.addListener((notificationId) => {
  notificationToConnectionMap.delete(notificationId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === 'PAGE_VISITED') {
    handlePageVisited(message.payload, sender).then(sendResponse).catch((error) => {
      console.error('PAGE_VISITED failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'GET_GRAPH') {
    handleGetGraph().then(sendResponse).catch((error) => {
      console.error('GET_GRAPH failed:', error);
      sendResponse({ nodes: [], edges: [] });
    });
    return true;
  }

  if (type === 'SEARCH_GRAPH') {
    handleSearchGraph(message.payload).then(sendResponse).catch((error) => {
      console.error('SEARCH_GRAPH failed:', error);
      sendResponse({ ok: false, reason: 'internal_error', graph: { nodes: [], edges: [] } });
    });
    return true;
  }

  if (type === 'GET_NODE_DETAIL') {
    handleGetNodeDetail(message.payload).then(sendResponse).catch((error) => {
      console.error('GET_NODE_DETAIL failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'QUERY_GRAPH') {
    handleQueryGraph(message.payload).then(sendResponse).catch((error) => {
      console.error('QUERY_GRAPH failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'WIPE_GRAPH' || type === 'CLEAR_GRAPH') {
    handleClearGraph().then(sendResponse).catch((error) => {
      console.error('CLEAR/WIPE failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'GET_SETTINGS') {
    getSettings().then((settings) => sendResponse({ ok: true, settings })).catch((error) => {
      console.error('GET_SETTINGS failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'UPDATE_SETTINGS') {
    updateSettings(message.payload || {}).then((settings) => sendResponse({ ok: true, settings })).catch((error) => {
      console.error('UPDATE_SETTINGS failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'GET_BACKEND_HEALTH') {
    handleGetBackendHealth().then(sendResponse).catch((error) => {
      console.error('GET_BACKEND_HEALTH failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  if (type === 'GET_ACTIVITY_LOG') {
    handleGetActivityLog(message.payload).then(sendResponse).catch((error) => {
      console.error('GET_ACTIVITY_LOG failed:', error);
      sendResponse({ ok: false, reason: 'internal_error', items: [] });
    });
    return true;
  }

  if (type === 'TEST_AI_CONNECTION') {
    handleTestAiConnection().then(sendResponse).catch((error) => {
      console.error('TEST_AI_CONNECTION failed:', error);
      sendResponse({ ok: false, reason: 'internal_error' });
    });
    return true;
  }

  return false;
});
