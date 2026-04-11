const STEPS = [
  {
    title: 'Loom learns how you think.',
    body: 'Browse normally. Loom passively builds a memory graph from what you read.',
  },
  {
    title: 'Watch your graph wake up.',
    body: 'As you browse, nodes and connections appear quietly in the graph canvas.',
  },
  {
    title: 'Everything stays local.',
    body: 'No account required. Your browsing intelligence remains on your machine.',
  },
];

export default function Onboarding({ step, checklist = [], onNext, onSkip }) {
  const safeStep = Math.max(0, Math.min(STEPS.length - 1, step));
  const active = STEPS[safeStep];
  const isLast = safeStep === STEPS.length - 1;

  return (
    <section className="onboarding-shell" aria-label="Onboarding flow">
      <p className="kicker">Day 1</p>
      <div className="status-chip status-chip-primary onboarding-chip">
        <span className="status-label">Phase</span>
        <span className="status-value">{safeStep + 1} of {STEPS.length}</span>
      </div>
      <h2>{active.title}</h2>
      <p>{active.body}</p>
      <div className="step-dots" aria-hidden="true">
        {STEPS.map((_, index) => (
          <span key={index} className={`dot ${index === safeStep ? 'active' : ''}`} />
        ))}
      </div>

      {!!checklist.length && (
        <div className="onboarding-checklist" aria-label="Setup checklist">
          {checklist.map((item) => (
            <div key={item.id} className={`check-item ${item.done ? 'done' : ''}`}>
              <span className="check-icon" aria-hidden="true">{item.done ? '✓' : '○'}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="onboarding-actions">
        <button type="button" className="pill-btn ghost" onClick={onSkip}>Skip</button>
        <button type="button" className="pill-btn" onClick={onNext}>{isLast ? 'Start Loom' : 'Continue'}</button>
      </div>
    </section>
  );
}
