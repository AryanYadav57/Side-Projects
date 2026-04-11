import { useEffect, useMemo, useState } from 'react';

function parseExcludes(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SettingsPanel({ settings, health, onSave, onTestAi, onRequestWipe, saving, testingAi, aiTestResult }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const excludesText = useMemo(() => (draft.excludedDomains || []).join('\n'), [draft.excludedDomains]);

  function patch(next) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <form className="settings-modern" onSubmit={handleSubmit}>
      <div className="settings-health" role="status" aria-live="polite">
        <span className="health-pill">AI key: {health?.hasApiKey ? 'set' : 'missing'}</span>
        <span className="health-pill">Provider: {health?.lastExtractionProvider || 'none'}</span>
        <span className="health-pill">Status: {health?.lastExtractionStatus || 'idle'}</span>
      </div>

      <div className="settings-grid">
        <label className="field-span-2">
          NVIDIA API key
          <input
            type="password"
            placeholder="nvapi-..."
            autoComplete="off"
            spellCheck="false"
            value={draft.apiKey || ''}
            onChange={(event) => patch({ apiKey: event.target.value.trim() })}
          />
        </label>

        <label>
          Nudge sensitivity
          <select value={draft.nudgeSensitivity || 'medium'} onChange={(event) => patch({ nudgeSensitivity: event.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Daily API limit
          <input type="number" min="1" max="999" value={draft.dailyApiLimit || 200} onChange={(event) => patch({ dailyApiLimit: Number(event.target.value) || 200 })} />
        </label>

        <label>
          Min dwell time (seconds)
          <input type="number" min="5" max="240" value={draft.minDwellTime || 30} onChange={(event) => patch({ minDwellTime: Number(event.target.value) || 30 })} />
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={Boolean(draft.quietHoursEnabled)} onChange={(event) => patch({ quietHoursEnabled: event.target.checked })} />
          Quiet hours enabled
        </label>

        <label>
          Quiet hours start
          <input type="time" value={draft.quietHoursStart || '22:00'} onChange={(event) => patch({ quietHoursStart: event.target.value })} />
        </label>

        <label>
          Quiet hours end
          <input type="time" value={draft.quietHoursEnd || '08:00'} onChange={(event) => patch({ quietHoursEnd: event.target.value })} />
        </label>
      </div>

      <label className="exclude-editor">
        Excluded domains (one per line)
        <textarea
          rows={6}
          value={excludesText}
          onChange={(event) => patch({ excludedDomains: parseExcludes(event.target.value) })}
        />
      </label>

      <div className="settings-actions">
        <button type="button" className="pill-btn danger ghost" onClick={onRequestWipe}>Wipe all data</button>
        <button type="submit" className="pill-btn" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </div>

      <div className="ai-test-row">
        <button type="button" className="pill-btn ghost" onClick={onTestAi} disabled={testingAi}>
          {testingAi ? 'Testing AI...' : 'Test AI connection'}
        </button>
        {aiTestResult?.message && (
          <p className={`ai-test-message ${aiTestResult.ok ? 'ok' : 'error'}`}>
            {aiTestResult.message}
          </p>
        )}
      </div>
    </form>
  );
}
