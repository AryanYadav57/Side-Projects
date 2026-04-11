export default function ConfirmModal({ open, title, body, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <p className="modal-kicker">Destructive action</p>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="modal-actions">
          <button type="button" className="pill-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="pill-btn danger" onClick={onConfirm}>Confirm wipe</button>
        </div>
      </div>
    </div>
  );
}
