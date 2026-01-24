import { useCricket } from './hooks/useCricket';

export const ScoringButtons = () => {
  const { state, actions } = useCricket();

  const runButtons = [
    { runs: 0, label: '•', type: 'dot' },
    { runs: 1, label: '1' },
    { runs: 2, label: '2' },
    { runs: 3, label: '3' },
    { runs: 4, label: '4' },
    { runs: 6, label: '6' }
  ];

  const extraButtons = [
    { type: 'wide', label: 'Wide', runs: 1 },
    { type: 'no-ball', label: 'No Ball', runs: 1 },
    { type: 'bye', label: 'Bye', runs: 1 },
    { type: 'leg-bye', label: 'Leg Bye', runs: 1 }
  ];

  // Check if innings is complete
  const isInningsComplete = state.balls >= state.totalBalls || state.wickets >= 10;

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
      <div className="card-header">Scoring</div>
      <div className="card-content-compact">
        {isInningsComplete && (
          <div style={{ 
            padding: '0.5rem', 
            marginBottom: '0.75rem', 
            background: '#e8f5e8', 
            color: '#2e7d32',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            🏁 Innings Complete
          </div>
        )}
        
        {/* Runs Buttons */}
        <div className="btn-grid btn-grid-6" style={{ marginBottom: '0.75rem' }}>
          {runButtons.map((button) => (
            <button
              key={button.label}
              onClick={() => handleRunClick(button)}
              disabled={isInningsComplete}
              className={`btn btn-sm ${
                button.runs >= 4 ? 'btn-success pulse' : 'btn-primary'
              }`}
              style={{
                opacity: isInningsComplete ? 0.5 : 1,
                cursor: isInningsComplete ? 'not-allowed' : 'pointer'
              }}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* Wicket Button */}
        <button
          onClick={actions.addWicket}
          disabled={isInningsComplete}
          className="btn btn-danger btn-sm"
          style={{ 
            width: '100%', 
            marginBottom: '0.75rem',
            opacity: isInningsComplete ? 0.5 : 1,
            cursor: isInningsComplete ? 'not-allowed' : 'pointer'
          }}
        >
          🏏 WICKET
        </button>

        {/* Extras Buttons */}
        <div className="btn-grid btn-grid-4">
          {extraButtons.map((extra) => (
            <button
              key={extra.type}
              onClick={() => handleExtraClick(extra)}
              disabled={isInningsComplete}
              className="btn btn-secondary btn-sm"
              style={{
                opacity: isInningsComplete ? 0.5 : 1,
                cursor: isInningsComplete ? 'not-allowed' : 'pointer'
              }}
            >
              {extra.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};