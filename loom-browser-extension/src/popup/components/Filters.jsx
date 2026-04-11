const TIME_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'concept', label: 'Concept' },
  { value: 'entity', label: 'Entity' },
  { value: 'claim', label: 'Claim' },
];

export default function Filters({ filters, onChange, domainOptions = [], selectedNodeId }) {
  return (
    <section className="filter-row" aria-label="Graph filters">
      <div className="filter-group">
        <span className="filter-label">Date range</span>
        <div className="filter-pills">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-pill ${(filters.timeRange || 'all') === option.value ? 'active' : ''}`}
              onClick={() => onChange({ ...filters, timeRange: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Domain</span>
        <select
          className="filter-select"
          value={filters.domain || 'all'}
          onChange={(event) => onChange({ ...filters, domain: event.target.value })}
        >
          <option value="all">All domains</option>
          {domainOptions.map((domain) => (
            <option key={domain} value={domain}>{domain}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <span className="filter-label">Type</span>
        <select
          className="filter-select"
          value={filters.nodeType}
          onChange={(event) => onChange({ ...filters, nodeType: event.target.value })}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <div className="range-row">
          <span className="filter-label">Min confidence</span>
          <span className="range-value">{filters.minConfidence || 0}</span>
        </div>
        <input
          className="filter-range"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={filters.minConfidence || 0}
          onChange={(event) => onChange({ ...filters, minConfidence: Number(event.target.value) })}
        />
      </div>

      <div className="filter-group">
        <div className="range-row">
          <span className="filter-label">Min weight</span>
          <span className="range-value">{filters.minWeight}</span>
        </div>
        <input
          className="filter-range"
          type="range"
          min="0"
          max="8"
          step="1"
          value={filters.minWeight}
          onChange={(event) => onChange({ ...filters, minWeight: Number(event.target.value) })}
        />
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className={`pill-btn ${filters.highlightMode ? '' : 'ghost'}`}
          onClick={() => onChange({ ...filters, highlightMode: !filters.highlightMode })}
        >
          Highlight mode
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.focusMode ? '' : 'ghost'}`}
          onClick={() => onChange({ ...filters, focusMode: !filters.focusMode })}
          disabled={!filters.focusMode && !selectedNodeId}
          title={!filters.focusMode && !selectedNodeId ? 'Select a node first' : 'Toggle focus mode'}
        >
          {filters.focusMode ? 'Exit focus' : 'Focus selected'}
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.onlyAiGenerated ? '' : 'ghost'}`}
          onClick={() => onChange({ ...filters, onlyAiGenerated: !filters.onlyAiGenerated })}
        >
          AI nodes only
        </button>
      </div>
    </section>
  );
}
