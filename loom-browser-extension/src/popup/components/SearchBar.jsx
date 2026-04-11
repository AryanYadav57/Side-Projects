export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onReset,
  loading,
  disabled,
  graphCountLabel,
}) {
  return (
    <form className="search-shell" onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor="loom-search-input">Search your knowledge graph</label>
      <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id="loom-search-input"
        type="text"
        placeholder="Ask or search your knowledge..."
        className="search-input"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" className="pill-btn" disabled={disabled || loading}>
        {loading ? '...' : 'Query'}
      </button>
      <button type="button" className="pill-btn ghost" onClick={onReset} disabled={disabled}>
        Reset
      </button>
      <span className="search-metric" aria-live="polite">{graphCountLabel}</span>
    </form>
  );
}
