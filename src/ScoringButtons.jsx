import { useCricket } from './hooks/useCricket';

export const ScoringButtons = () => {
  const { actions } = useCricket();

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

  const handleRunClick = (button) => {
    actions.addRuns(button.runs);
  };

  const handleExtraClick = (extra) => {
    let totalRuns = extra.runs;
    if (extra.type === 'no-ball') {
      const input = prompt('No-ball: additional runs off the bat? (0 for none)', '0');
      const batRuns = Math.max(0, parseInt(input || '0', 10) || 0);
      totalRuns = 1 + batRuns; // 1 no-ball + bat runs
    } else if (extra.type === 'wide') {
      const input = prompt('How many wides? (default 1)', String(extra.runs));
      const wides = Math.max(1, parseInt(input || String(extra.runs), 10) || extra.runs);
      totalRuns = wides; // wides equal entered count
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
        {/* Runs Buttons */}
        <div className="btn-grid btn-grid-6" style={{ marginBottom: '0.75rem' }}>
          {runButtons.map((button) => (
            <button
              key={button.label}
              onClick={() => handleRunClick(button)}
              className={`btn btn-sm ${
                button.runs >= 4 ? 'btn-success pulse' : 'btn-primary'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* Wicket Button */}
        <button
          onClick={actions.addWicket}
          className="btn btn-danger btn-sm"
          style={{ width: '100%', marginBottom: '0.75rem' }}
        >
          🏏 WICKET
        </button>

        {/* Extras Buttons */}
        <div className="btn-grid btn-grid-4">
          {extraButtons.map((extra) => (
            <button
              key={extra.type}
              onClick={() => handleExtraClick(extra)}
              className="btn btn-secondary btn-sm"
            >
              {extra.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};