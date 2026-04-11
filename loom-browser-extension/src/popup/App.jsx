import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import ConfirmModal from './components/ConfirmModal';
import Filters from './components/Filters';
import GraphCanvas from './components/GraphCanvas';
import ActivityLog from './components/ActivityLog';
import NodePanel from './components/NodePanel';
import Onboarding from './components/Onboarding';
import SearchBar from './components/SearchBar';
import SettingsPanel from './components/SettingsPanel';
import { sendRuntimeMessage } from './lib/runtime';

/**
 * Loom — Root Application Component
 * 
 * Views: graph (default) | settings | onboarding
 * Phase 1: Shows the empty-state canvas with pulsing node animation.
 * Phase 5+: Renders D3 force-directed graph on the canvas.
 */
export default function App() {
  const popupRef = useRef(null);
  const pulseRef = useRef(new Map());
  const [baseGraph, setBaseGraph] = useState({ nodes: [], edges: [] });
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [totalGraphCounts, setTotalGraphCounts] = useState({ nodes: 0, edges: 0 });
  const [view, setView] = useState('graph');
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [querySummary, setQuerySummary] = useState('');
  const [querySources, setQuerySources] = useState([]);
  const [filters, setFilters] = useState({
    timeRange: 'all',
    nodeType: 'all',
    domain: 'all',
    minConfidence: 0,
    minWeight: 0,
    onlyAiGenerated: false,
    highlightMode: false,
    focusMode: false,
  });
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [nodeDetail, setNodeDetail] = useState(null);
  const [loadingNodeDetail, setLoadingNodeDetail] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [settings, setSettings] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [toast, setToast] = useState(null);

  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  const hasChromeMessaging = useMemo(
    () => Boolean(globalThis.chrome?.runtime?.sendMessage),
    []
  );

  async function refreshRuntimeState() {
    const [healthResult, activityResult] = await Promise.all([
      sendRuntimeMessage({ type: 'GET_BACKEND_HEALTH' }),
      sendRuntimeMessage({ type: 'GET_ACTIVITY_LOG', payload: { limit: 20 } }),
    ]);

    if (healthResult?.ok) {
      setBackendHealth(healthResult);
    }

    if (activityResult?.ok && Array.isArray(activityResult.items)) {
      setActivityLog(activityResult.items);
    }
  }

  function notify(message, type = 'ok') {
    if (!message) return;
    setToast({ id: Date.now(), message, type });
  }

  useEffect(() => {
    if (!toast?.id) return undefined;
    const timeoutId = setTimeout(() => {
      setToast(null);
    }, 2400);
    return () => clearTimeout(timeoutId);
  }, [toast?.id]);

  useEffect(() => {
    async function bootstrap() {
      const [settingsResponse, graphResponse, healthResponse, activityResponse] = await Promise.all([
        sendRuntimeMessage({ type: 'GET_SETTINGS' }),
        sendRuntimeMessage({ type: 'GET_GRAPH' }),
        sendRuntimeMessage({ type: 'GET_BACKEND_HEALTH' }),
        sendRuntimeMessage({ type: 'GET_ACTIVITY_LOG', payload: { limit: 20 } }),
      ]);

      if (settingsResponse?.ok && settingsResponse.settings) {
        setSettings(settingsResponse.settings);
        if (!settingsResponse.settings.onboardingComplete) {
          setView('onboarding');
        }
      }

      if (graphResponse?.nodes && graphResponse?.edges) {
        setBaseGraph(graphResponse);
        setGraph(graphResponse);
        setTotalGraphCounts({ nodes: graphResponse.nodes.length, edges: graphResponse.edges.length });
      }

      if (healthResponse?.ok) {
        setBackendHealth(healthResponse);
      }

      if (activityResponse?.ok && Array.isArray(activityResponse.items)) {
        setActivityLog(activityResponse.items);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (view !== 'settings') return;
    refreshRuntimeState();
  }, [view]);

  useEffect(() => {
    if (view !== 'graph') return undefined;

    refreshRuntimeState();

    const intervalId = setInterval(() => {
      if (document.hidden) return;
      refreshRuntimeState();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [view]);

  useEffect(() => {
    if (!hasChromeMessaging) return;

    if (!query.trim()) {
      setLoadingSearch(false);
      setGraph(baseGraph);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setLoadingSearch(true);
      const result = await sendRuntimeMessage({ type: 'SEARCH_GRAPH', payload: { query } });

      if (result?.ok && result.graph) {
        setGraph(result.graph);
        setTotalGraphCounts({
          nodes: typeof result.totalNodes === 'number' ? result.totalNodes : result.graph.nodes.length,
          edges: typeof result.totalEdges === 'number' ? result.totalEdges : result.graph.edges.length,
        });
      }

      setLoadingSearch(false);
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [query, hasChromeMessaging]);

  useEffect(() => {
    if (!hasChromeMessaging || !chrome.runtime?.onMessage) return;

    const onRuntimeMessage = (message) => {
      if (message?.type !== 'GRAPH_CONNECTION_ACTIVITY') return;
      const payload = message?.payload;
      if (!payload?.edgeId) return;

      pulseRef.current.set(payload.edgeId, {
        startedAt: Date.now(),
        isNew: Boolean(payload.isNew),
      });
      if (pulseRef.current.size > 300) {
        const cutoff = Date.now() - 10000;
        pulseRef.current.forEach((value, key) => {
          if (Number(value?.startedAt || 0) < cutoff) {
            pulseRef.current.delete(key);
          }
        });
      }

      sendRuntimeMessage({ type: 'SEARCH_GRAPH', payload: { query } }).then((result) => {
        if (result?.ok && result.graph) {
          setGraph(result.graph);
          setTotalGraphCounts({
            nodes: typeof result.totalNodes === 'number' ? result.totalNodes : result.graph.nodes.length,
            edges: typeof result.totalEdges === 'number' ? result.totalEdges : result.graph.edges.length,
          });
        }
      });

      refreshRuntimeState();
    };

    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, [hasChromeMessaging, query]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedNodeId) {
        setNodeDetail(null);
        return;
      }

      setLoadingNodeDetail(true);
      const detail = await sendRuntimeMessage({ type: 'GET_NODE_DETAIL', payload: { nodeId: selectedNodeId } });
      if (detail?.ok) {
        setNodeDetail(detail);
      }
      setLoadingNodeDetail(false);
    }

    loadDetail();
  }, [selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId || !filters.focusMode) return;
    setFilters((prev) => ({ ...prev, focusMode: false }));
  }, [selectedNodeId, filters.focusMode]);

  useEffect(() => {
    if (view !== 'graph') return undefined;

    function onKeyDown(event) {
      const targetTag = String(event.target?.tagName || '').toLowerCase();
      const isEditable = targetTag === 'input' || targetTag === 'textarea' || Boolean(event.target?.isContentEditable);

      if (!isEditable && (event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'))) {
        event.preventDefault();
        const searchInput = document.getElementById('loom-search-input');
        searchInput?.focus();
        searchInput?.select?.();
        return;
      }

      if (event.key !== 'Escape') return;
      if (filters.focusMode) {
        setFilters((prev) => ({ ...prev, focusMode: false }));
        return;
      }
      if (selectedNodeId) {
        setSelectedNodeId('');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, filters.focusMode, selectedNodeId]);

  async function handleRunQuery(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoadingSearch(true);
    const result = await sendRuntimeMessage({ type: 'QUERY_GRAPH', payload: { query } });
    if (result?.ok) {
      if (result.graph?.nodes && result.graph?.edges) {
        setGraph(result.graph);
      }
      setQuerySummary(result.summary || '');
      setQuerySources(result.sources || []);
      setSelectedNodeId('');
    }
    setLoadingSearch(false);
  }

  function handleResetQuery() {
    setQuery('');
    setQuerySummary('');
    setQuerySources([]);
    setGraph(baseGraph);
    setSelectedNodeId('');
  }

  async function handleSaveSettings(nextSettings) {
    setSavingSettings(true);
    setAiTestResult(null);
    const result = await sendRuntimeMessage({ type: 'UPDATE_SETTINGS', payload: nextSettings });
    if (result?.ok) {
      setSettings(result.settings);
      await refreshRuntimeState();
      notify('Settings saved.', 'ok');
    } else {
      notify('Could not save settings.', 'error');
    }
    setSavingSettings(false);
  }

  async function handleTestAiConnection() {
    setTestingAi(true);
    const result = await sendRuntimeMessage({ type: 'TEST_AI_CONNECTION' });
    setAiTestResult(result || { ok: false, message: 'No response from background service worker.' });
    await refreshRuntimeState();
    notify(result?.message || 'AI test finished.', result?.ok ? 'ok' : 'error');
    setTestingAi(false);
  }

  async function handleOnboardingAdvance() {
    if (onboardingStep < 2) {
      setOnboardingStep((prev) => prev + 1);
      return;
    }

    const result = await sendRuntimeMessage({
      type: 'UPDATE_SETTINGS',
      payload: { onboardingComplete: true },
    });

    if (result?.ok) {
      setSettings(result.settings);
      setView('graph');
    }
  }

  async function handleOnboardingSkip() {
    const result = await sendRuntimeMessage({
      type: 'UPDATE_SETTINGS',
      payload: { onboardingComplete: true },
    });

    if (result?.ok) {
      setSettings(result.settings);
      setView('graph');
    }
  }

  async function handleClearGraph() {
    const result = await sendRuntimeMessage({ type: 'WIPE_GRAPH' });
    if (!result?.ok) return;

    setShowWipeModal(false);
    setBaseGraph({ nodes: [], edges: [] });
    setGraph({ nodes: [], edges: [] });
    setTotalGraphCounts({ nodes: 0, edges: 0 });
    setQuery('');
    setQuerySummary('');
    setQuerySources([]);
    setSelectedNodeId('');
    setActivityLog([]);
    setView('graph');
    notify('Graph and local data cleared.', 'ok');
  }

  const graphCountLabel = `${nodeCount}/${edgeCount}`;

  const showGraphView = view === 'graph';
  const showSettingsView = view === 'settings';
  const showOnboardingView = view === 'onboarding';

  const activeProviderLabel = backendHealth?.lastExtractionProvider === 'nvidia'
    ? 'NVIDIA AI'
    : backendHealth?.lastExtractionProvider === 'heuristic'
      ? 'Fallback mode'
      : 'Idle';

  const domainOptions = useMemo(() => {
    const domains = new Set(
      (baseGraph.nodes || [])
        .map((node) => String(node.domain || '').trim().toLowerCase())
        .filter(Boolean)
    );
    return [...domains].slice(0, 50);
  }, [baseGraph.nodes]);

  const onboardingChecklist = useMemo(() => ([
    { id: 'installed', label: 'Extension is active', done: true },
    { id: 'key', label: 'AI key is loaded', done: Boolean(backendHealth?.hasApiKey) },
    { id: 'extract', label: 'At least one extraction happened', done: Number(backendHealth?.lastExtractionAt || 0) > 0 },
    { id: 'graph', label: 'Graph has captured nodes', done: totalGraphCounts.nodes > 0 },
  ]), [backendHealth?.hasApiKey, backendHealth?.lastExtractionAt, totalGraphCounts.nodes]);

  const lastExtractionLabel = backendHealth?.lastExtractionAt
    ? new Date(backendHealth.lastExtractionAt).toLocaleTimeString()
    : 'never';

  const focusedNodeLabel = useMemo(() => {
    if (!selectedNodeId) return '';
    const fromCurrent = (graph.nodes || []).find((node) => node.id === selectedNodeId)?.title;
    if (fromCurrent) return fromCurrent;
    return (baseGraph.nodes || []).find((node) => node.id === selectedNodeId)?.title || '';
  }, [selectedNodeId, graph.nodes, baseGraph.nodes]);

  useEffect(() => {
    const root = popupRef.current;
    if (!root) return undefined;

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        noPreference: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduceMotion } = context.conditions;

        const header = root.querySelector('.popup-header');
        const statusStrip = root.querySelector('.status-strip');
        const searchShell = root.querySelector('.search-shell');
        const filterRow = root.querySelector('.filter-row');
        const graphStage = root.querySelector('.graph-stage');
        const settingsShell = root.querySelector('.settings-modern');
        const onboardingShell = root.querySelector('.onboarding-shell');
        const querySummary = root.querySelector('.query-summary');

        if (reduceMotion) {
          gsap.set([header, statusStrip, searchShell, filterRow, graphStage, settingsShell, onboardingShell, querySummary].filter(Boolean), {
            autoAlpha: 1,
            clearProps: 'all',
          });
          return undefined;
        }

        const timeline = gsap.timeline({ defaults: { duration: 0.42, ease: 'power2.out', overwrite: 'auto' } });

        if (header) timeline.from(header, { autoAlpha: 0, y: -10 }, 0);
        if (statusStrip) timeline.from(statusStrip, { autoAlpha: 0, y: -8 }, 0.05);

        if (showGraphView) {
          if (searchShell) timeline.from(searchShell, { autoAlpha: 0, y: -8 }, 0.08);
          if (filterRow) timeline.from(filterRow, { autoAlpha: 0, y: -8 }, 0.12);
          if (graphStage) timeline.from(graphStage, { autoAlpha: 0, y: 12, scale: 0.985 }, 0.16);
          if (querySummary) timeline.from(querySummary, { autoAlpha: 0, y: 8 }, 0.2);
        }

        if (showSettingsView && settingsShell) {
          timeline.from(settingsShell, { autoAlpha: 0, y: 14, scale: 0.988 }, 0.12);
        }

        if (showOnboardingView && onboardingShell) {
          timeline.from(onboardingShell, { autoAlpha: 0, y: 14, scale: 0.99 }, 0.12);
          timeline.from(
            onboardingShell.querySelectorAll('h2, p, .status-chip, .step-dots, .onboarding-actions'),
            { autoAlpha: 0, y: 8, stagger: 0.05 },
            0.18
          );
        }

        return () => timeline.kill();
      },
      root
    );

    return () => {
      mm.revert();
    };
  }, [showGraphView, showSettingsView, showOnboardingView]);

  return (
    <div className="popup-container" ref={popupRef}>

      {/* ============ HEADER ============ */}
      <header className="popup-header">
        <div className="header-brand">
          <div className="loom-logo">
            <div className="loom-logo-inner" />
          </div>
          <span className="brand-text">LOOM</span>
        </div>
        <div className="header-meta">
          <div className="node-counter">
            <span className="node-count-num">{totalGraphCounts.nodes}</span>
            <span className="node-count-label">nodes</span>
          </div>
          <button
            className="header-btn"
            onClick={() => setView(view === 'settings' ? 'graph' : 'settings')}
            title="Settings"
            aria-label="Toggle settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

        <main className="popup-scroll">
          <section className="status-strip" aria-label="Workspace status">
            <div className="status-chip status-chip-primary">
              <span className="status-label">Graph</span>
              <span className="status-value">{totalGraphCounts.nodes} nodes</span>
            </div>
            <div className="status-chip">
              <span className="status-label">Edges</span>
              <span className="status-value">{totalGraphCounts.edges}</span>
            </div>
            <div className="status-chip">
              <span className="status-label">AI</span>
              <span className="status-value">{activeProviderLabel}</span>
            </div>
            <div className="status-chip status-chip-muted">
              <span className="status-label">Mode</span>
              <span className="status-value">{showSettingsView ? 'Settings' : showOnboardingView ? 'Onboarding' : filters.focusMode ? 'Focus' : 'Explore'}</span>
            </div>
          </section>

          {showOnboardingView && (
            <Onboarding
              step={onboardingStep}
              checklist={onboardingChecklist}
              onNext={handleOnboardingAdvance}
              onSkip={handleOnboardingSkip}
            />
          )}

          {!showOnboardingView && (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleRunQuery}
                onReset={handleResetQuery}
                loading={loadingSearch}
                disabled={!showGraphView}
                graphCountLabel={graphCountLabel}
              />

              <Filters
                filters={filters}
                onChange={setFilters}
                domainOptions={domainOptions}
                selectedNodeId={selectedNodeId}
              />

              {showGraphView && filters.focusMode && selectedNodeId && (
                <section className="focus-banner" aria-label="Focus mode status">
                  <p>
                    <strong>Focus mode:</strong> {focusedNodeLabel || 'Selected node'} and nearest connections
                  </p>
                  <button
                    type="button"
                    className="pill-btn ghost"
                    onClick={() => setFilters((prev) => ({ ...prev, focusMode: false }))}
                  >
                    Exit focus
                  </button>
                </section>
              )}

              <section className={`ai-status-banner ${backendHealth?.lastExtractionStatus === 'error' ? 'error' : backendHealth?.lastExtractionStatus === 'fallback' ? 'warn' : ''}`} aria-live="polite">
                <p>
                  <strong>AI status:</strong> {backendHealth?.aiStatusMessage || 'AI is idle. Browse pages to trigger extraction.'}
                </p>
                <p>
                  Last extraction: {lastExtractionLabel}
                </p>
              </section>

              {showGraphView && (
                <>
                  <main className="main-layout">
                    <GraphCanvas
                      graph={graph}
                      filters={filters}
                      query={query}
                      selectedNodeId={selectedNodeId}
                      pulseRef={pulseRef}
                      onSelectNode={setSelectedNodeId}
                      showEmpty={nodeCount === 0}
                    />
                    <NodePanel
                      detail={nodeDetail}
                      loading={loadingNodeDetail}
                      onClose={() => setSelectedNodeId('')}
                      onNotify={notify}
                    />
                  </main>
                  <ActivityLog items={activityLog} />
                </>
              )}

              {showSettingsView && settings && (
                <section className="settings-wrapper" aria-label="Settings">
                  <SettingsPanel
                    settings={settings}
                    health={backendHealth}
                    onSave={handleSaveSettings}
                    onTestAi={handleTestAiConnection}
                    onRequestWipe={() => setShowWipeModal(true)}
                    saving={savingSettings}
                    testingAi={testingAi}
                    aiTestResult={aiTestResult}
                  />
                </section>
              )}

              {querySummary && showGraphView && (
                <section className="query-summary" aria-live="polite">
                  <p>{querySummary}</p>
                  {!!querySources.length && (
                    <ul>
                      {querySources.slice(0, 4).map((source) => (
                        <li key={source.id || source.label}>{source.label || source.id}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <ConfirmModal
                open={showWipeModal}
                title="Wipe all Loom data?"
                body="This action clears graph, settings, events, and scheduled reminders. It cannot be undone."
                onCancel={() => setShowWipeModal(false)}
                onConfirm={handleClearGraph}
              />

              {toast && (
                <div className={`toast ${toast.type === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
                  {toast.message}
                </div>
              )}
            </>
          )}
        </main>

    </div>
  );
}
