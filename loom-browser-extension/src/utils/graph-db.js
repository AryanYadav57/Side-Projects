const DB_NAME = 'loomKnowledgeDB';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('nodes')) {
        const nodes = db.createObjectStore('nodes', { keyPath: 'id' });
        nodes.createIndex('lastSeen', 'lastSeen', { unique: false });
        nodes.createIndex('weight', 'weight', { unique: false });
        nodes.createIndex('normalizedLabel', 'normalizedLabel', { unique: false });
      }

      if (!db.objectStoreNames.contains('edges')) {
        const edges = db.createObjectStore('edges', { keyPath: 'id' });
        edges.createIndex('lastSeen', 'lastSeen', { unique: false });
        edges.createIndex('source', 'source', { unique: false });
        edges.createIndex('target', 'target', { unique: false });
      }

      if (!db.objectStoreNames.contains('events')) {
        const events = db.createObjectStore('events', { keyPath: 'id' });
        events.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('connections')) {
        const connections = db.createObjectStore('connections', { keyPath: 'id' });
        connections.createIndex('detectedAt', 'detectedAt', { unique: false });
        connections.createIndex('pairKey', 'pairKey', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function withTransaction(storeNames, mode, runner) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const stores = {};
    storeNames.forEach((name) => {
      stores[name] = tx.objectStore(name);
    });

    let runnerValue;
    try {
      runnerValue = runner(stores, tx);
    } catch (error) {
      reject(error);
      tx.abort();
      return;
    }

    tx.oncomplete = () => {
      db.close();
      resolve(runnerValue);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction aborted'));
    };
  }));
}

function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function normalizeLabel(label) {
  return String(label || '').trim().toLowerCase();
}

function nodeIdFromTypeAndLabel(type, label) {
  return `${type}:${normalizeLabel(label).replace(/\s+/g, '_').slice(0, 120)}`;
}

function edgeId(a, b) {
  const sorted = [a, b].sort();
  return `${sorted[0]}::${sorted[1]}`;
}

function nowTs() {
  return Date.now();
}

function deriveWeight(visitCount) {
  return Math.max(0.05, Math.min(1, Math.log10((visitCount || 1) + 1)));
}

export async function upsertNode({ label, type = 'concept', eventId, timestamp, domain = '', confidence = 0, aiGenerated = true }) {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;

  const id = nodeIdFromTypeAndLabel(type, normalized);
  const ts = timestamp || nowTs();

  return withTransaction(['nodes'], 'readwrite', async ({ nodes }) => {
    const existing = await reqAsPromise(nodes.get(id));
    const nextVisitCount = (existing?.visitCount || 0) + 1;

    const updated = {
      id,
      label: existing?.label || label,
      normalizedLabel: normalized,
      type,
      domain: domain || existing?.domain || '',
      confidence: Math.max(Number(existing?.confidence || 0), Number(confidence || 0)),
      aiGenerated: typeof existing?.aiGenerated === 'boolean' ? existing.aiGenerated : Boolean(aiGenerated),
      weight: deriveWeight(nextVisitCount),
      visitCount: nextVisitCount,
      firstSeen: existing?.firstSeen || ts,
      lastSeen: ts,
      sources: Array.from(new Set([...(existing?.sources || []), eventId].filter(Boolean))).slice(-200),
    };

    nodes.put(updated);
    return updated;
  });
}

export async function upsertEdge({ source, target, timestamp }) {
  if (!source || !target || source === target) return null;
  const id = edgeId(source, target);
  const ts = timestamp || nowTs();

  return withTransaction(['edges'], 'readwrite', async ({ edges }) => {
    const existing = await reqAsPromise(edges.get(id));
    const coOccurrences = (existing?.coOccurrences || 0) + 1;

    const updated = {
      id,
      source,
      target,
      strength: Math.max(0.05, Math.min(1, Math.log10(coOccurrences + 1))),
      coOccurrences,
      firstSeen: existing?.firstSeen || ts,
      lastSeen: ts,
    };

    edges.put(updated);
    return updated;
  });
}

export async function addEvent(event) {
  const payload = {
    id: event?.id || `event_${nowTs()}_${Math.random().toString(36).slice(2, 8)}`,
    url: event?.url || '',
    domain: event?.domain || '',
    title: event?.title || '',
    timestamp: event?.timestamp || nowTs(),
    dwellTime: event?.dwellTime || 0,
    concepts: event?.concepts || [],
    summary: event?.summary || '',
    processed: Boolean(event?.processed),
  };

  return withTransaction(['events'], 'readwrite', ({ events }) => {
    events.put(payload);
    return payload;
  });
}

export async function addConnection(connection) {
  const payload = {
    id: connection?.id || `conn_${nowTs()}_${Math.random().toString(36).slice(2, 8)}`,
    pairKey: connection?.pairKey || '',
    nodeA: connection?.nodeA || '',
    nodeB: connection?.nodeB || '',
    score: Number(connection?.score || 0),
    tier: connection?.tier || 'noise',
    explanation: connection?.explanation || '',
    detectedAt: connection?.detectedAt || nowTs(),
    nudgeSent: Boolean(connection?.nudgeSent),
    nudgeDismissed: Boolean(connection?.nudgeDismissed),
    nudgeClicked: Boolean(connection?.nudgeClicked),
  };

  return withTransaction(['connections'], 'readwrite', ({ connections }) => {
    connections.put(payload);
    return payload;
  });
}

export async function updateConnectionFlags(connectionId, flags) {
  if (!connectionId) return null;
  return withTransaction(['connections'], 'readwrite', async ({ connections }) => {
    const existing = await reqAsPromise(connections.get(connectionId));
    if (!existing) return null;
    const updated = { ...existing, ...(flags || {}) };
    connections.put(updated);
    return updated;
  });
}

export async function hasNudgedPair(pairKey) {
  if (!pairKey) return false;
  const allConnections = await getAllConnections();
  return allConnections.some((item) => item.pairKey === pairKey && item.nudgeSent);
}

export async function getRecentNudgesCount(sinceMs) {
  const allConnections = await getAllConnections();
  return allConnections.filter((item) => item.nudgeSent && item.detectedAt >= sinceMs).length;
}

export async function getAllConnections() {
  return withTransaction(['connections'], 'readonly', async ({ connections }) => reqAsPromise(connections.getAll()));
}

export async function getAllNodes() {
  return withTransaction(['nodes'], 'readonly', async ({ nodes }) => reqAsPromise(nodes.getAll()));
}

export async function getAllEdges() {
  return withTransaction(['edges'], 'readonly', async ({ edges }) => reqAsPromise(edges.getAll()));
}

export async function getGraphSnapshot() {
  const [nodes, edges] = await Promise.all([getAllNodes(), getAllEdges()]);
  return { nodes, edges };
}

export async function getNodeDetail(nodeId) {
  const [nodes, edges, events] = await Promise.all([
    getAllNodes(),
    getAllEdges(),
    withTransaction(['events'], 'readonly', async ({ events: eventStore }) => reqAsPromise(eventStore.getAll())),
  ]);

  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return null;

  const relatedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
  const relatedNodeIds = new Set();
  relatedEdges.forEach((edge) => {
    relatedNodeIds.add(edge.source === nodeId ? edge.target : edge.source);
  });

  const relatedNodes = nodes.filter((item) => relatedNodeIds.has(item.id));
  const sources = events.filter((event) => (node.sources || []).includes(event.id));

  return {
    node,
    connections: relatedNodes,
    edges: relatedEdges,
    sources,
  };
}

export async function runWeeklyPruning() {
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return withTransaction(['nodes', 'edges'], 'readwrite', async ({ nodes, edges }) => {
    const [allNodes, allEdges] = await Promise.all([reqAsPromise(nodes.getAll()), reqAsPromise(edges.getAll())]);

    const activeNodeIds = new Set();
    allEdges.forEach((edge) => {
      activeNodeIds.add(edge.source);
      activeNodeIds.add(edge.target);
    });

    allNodes.forEach((node) => {
      const agedWeight = node.lastSeen < cutoffMs ? Math.max(0, node.weight - 0.1) : node.weight;
      if (!activeNodeIds.has(node.id) && agedWeight < 0.2) {
        nodes.delete(node.id);
        return;
      }

      if (agedWeight !== node.weight) {
        nodes.put({ ...node, weight: agedWeight });
      }
    });

    return true;
  });
}

export async function clearAllData() {
  return withTransaction(['nodes', 'edges', 'events', 'connections', 'settings'], 'readwrite', ({ nodes, edges, events, connections, settings }) => {
    nodes.clear();
    edges.clear();
    events.clear();
    connections.clear();
    settings.clear();
    return true;
  });
}
