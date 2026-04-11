function formatDate(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '-';
  }
}

function openSourceUrl(url) {
  if (!url) return;
  try {
    if (globalThis.chrome?.tabs?.create) {
      chrome.tabs.create({ url });
      return true;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}

async function copySourceUrl(url) {
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export default function NodePanel({ detail, loading, onClose, onNotify }) {
  if (!detail) {
    return (
      <aside className="node-panel empty" aria-label="Node details">
        <div>
          <h3>Node details</h3>
          <p>Select a node to inspect source pages, timestamps, and connected ideas.</p>
        </div>
      </aside>
    );
  }

  const { node, connections = [], sources = [] } = detail;

  async function handleCopyUrl(url) {
    const ok = await copySourceUrl(url);
    if (!onNotify) return;
    onNotify(ok ? 'Source URL copied to clipboard.' : 'Could not copy source URL.', ok ? 'ok' : 'error');
  }

  function handleOpenUrl(url) {
    const ok = openSourceUrl(url);
    if (!onNotify) return;
    onNotify(ok ? 'Opened source page in a new tab.' : 'Could not open source page.', ok ? 'ok' : 'error');
  }

  return (
    <aside className="node-panel" aria-label="Node details">
      <div className="panel-head">
        <div>
          <h3>{node?.label || 'Unknown node'}</h3>
          <p>{node?.type || 'concept'} · Seen {node?.visitCount || 0} times</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close node details">×</button>
      </div>

      {loading && <p className="muted">Loading details...</p>}

      <div className="detail-meta">
        <span>First seen: {formatDate(node?.firstSeen)}</span>
        <span>Last seen: {formatDate(node?.lastSeen)}</span>
      </div>

      <section>
        <h4>Connected nodes</h4>
        <ul className="compact-list">
          {connections.slice(0, 8).map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <span className="muted">{item.type}</span>
            </li>
          ))}
          {!connections.length && <li className="muted">No connections yet.</li>}
        </ul>
      </section>

      <section>
        <h4>Source pages</h4>
        <ul className="compact-list">
          {sources.slice(0, 8).map((source) => (
            <li key={source.id}>
              <div className="source-row">
                <span>{source.title || source.url || source.id}</span>
                <span className="muted">{formatDate(source.timestamp)}</span>
              </div>
              <div className="source-actions">
                <button type="button" className="mini-btn" onClick={() => handleOpenUrl(source.url)}>Open</button>
                <button type="button" className="mini-btn ghost" onClick={() => handleCopyUrl(source.url)}>Copy URL</button>
              </div>
            </li>
          ))}
          {!sources.length && <li className="muted">No source events available.</li>}
        </ul>
      </section>
    </aside>
  );
}
