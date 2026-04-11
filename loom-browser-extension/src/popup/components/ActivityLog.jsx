function formatRelative(ts) {
  if (!ts) return 'just now';
  const diffMs = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function iconForType(type) {
  if (type === 'visit') return 'V';
  if (type === 'extraction') return 'AI';
  if (type === 'extraction_skipped') return '!';
  if (type === 'connection') return 'C';
  return '•';
}

export default function ActivityLog({ items = [] }) {
  return (
    <section className="activity-log" aria-label="Recent activity">
      <div className="activity-head">
        <h3>Recent activity</h3>
        <span className="muted">{items.length} events</span>
      </div>

      {!items.length && <p className="muted">No activity yet. Browse a few pages to start collecting events.</p>}

      {!!items.length && (
        <ul className="activity-list">
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className="activity-item">
              <span className="activity-icon" aria-hidden="true">{iconForType(item.type)}</span>
              <div className="activity-copy">
                <p>{item.title || 'Activity update'}</p>
                <p className="muted">{item.detail || ''}</p>
              </div>
              <span className="activity-time">{formatRelative(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
