import { useCricket } from './hooks/useCricket';
import { isInningsOver } from './matchRules';

const runButtons = [
  { runs: 0, label: '0', sub: 'Dot', cls: 'is-dot' },
  { runs: 1, label: '1', sub: 'Single' },
  { runs: 2, label: '2', sub: 'Double' },
  { runs: 3, label: '3', sub: 'Triple' },
  { runs: 4, label: '4', sub: 'Four', cls: 'is-four' },
  { runs: 6, label: '6', sub: 'Six', cls: 'is-six' }
];

const extraButtons = [
  { type: 'wide', label: 'Wide', runs: 1 },
  { type: 'no-ball', label: 'No Ball', runs: 1 },
  { type: 'bye', label: 'Bye', runs: 1 },
  { type: 'leg-bye', label: 'Leg Bye', runs: 1 }
];

export const ScoringButtons = () => {
  const { state, actions } = useCricket();
  const isInningsComplete = isInningsOver(state);

  const handleRunClick = (button) => {
    if (isInningsComplete) return;
    actions.addRuns(button.runs);
  };

  const handleExtraClick = (extra) => {
    if (isInningsComplete) return;
    let totalRuns = extra.runs;
    if (extra.type === 'no-ball') {
      const input = prompt('No-ball (1 run) + additional runs off the bat? (0 for none)', '0');
      const batRuns = Math.max(0, parseInt(input || '0', 10) || 0);
      totalRuns = 1 + batRuns; // 1 no-ball + bat runs
    } else if (extra.type === 'wide') {
      const input = prompt('Wide (1 run) + additional runs (e.g., overthrow)? (0 for none)', '0');
      const additionalRuns = Math.max(0, parseInt(input || '0', 10) || 0);
      totalRuns = 1 + additionalRuns; // 1 wide + additional runs
    } else if (extra.type === 'bye' || extra.type === 'leg-bye') {
      const input = prompt(`How many ${extra.type === 'bye' ? 'byes' : 'leg-byes'}? (default 1)`, String(extra.runs));
      const runs = Math.max(1, parseInt(input || String(extra.runs), 10) || extra.runs);
      totalRuns = runs; // byes/leg-byes equal entered runs
    }
    actions.addRuns(totalRuns, true, extra.type);
  };

  return (
    <div className="card">
      <div className="card-header">
        Scoring
        <span className="card-header-meta">Tap or use keyboard</span>
      </div>
      <div className="card-content-compact">
        {isInningsComplete && (
          <div className="inline-banner">🏁 Innings complete — switch innings or reset to continue</div>
        )}

        <div className="run-pad">
          {runButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={() => handleRunClick(button)}
              disabled={isInningsComplete}
              className={`run-btn ${button.cls || ''}`}
              aria-label={`${button.runs} run${button.runs === 1 ? '' : 's'}`}
            >
              <kbd aria-hidden="true">{button.runs}</kbd>
              {button.label}
              <small>{button.sub}</small>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={actions.addWicket}
          disabled={isInningsComplete}
          className="btn btn-danger btn-block wicket-btn"
        >
          Wicket <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', opacity: .7 }}>W</kbd>
        </button>

        <div className="btn-grid btn-grid-4 extras-row">
          {extraButtons.map((extra) => (
            <button
              key={extra.type}
              type="button"
              onClick={() => handleExtraClick(extra)}
              disabled={isInningsComplete}
              className="btn btn-sm"
            >
              {extra.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
