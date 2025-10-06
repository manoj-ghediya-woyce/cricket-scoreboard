import { useState } from 'react';
import { useCricket } from './hooks/useCricket';

export const ControlPanel = () => {
  const { state, actions } = useCricket();
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [oversInput, setOversInput] = useState('20');
  const [teamA, setTeamA] = useState(state.teamAName || 'Team A');
  const [teamB, setTeamB] = useState(state.teamBName || 'Team B');

  const handleSetTarget = () => {
    const target = parseInt(targetInput);
    const overs = parseInt(oversInput);
    if (target > 0 && overs > 0) {
      actions.setTarget(target, overs);
      setShowTargetModal(false);
      setTargetInput('');
      setOversInput('20');
    }
  };

  const handleReset = () => {
    actions.reset();
    setShowResetModal(false);
  };

  return (
    <>
      <div className="card">
        <div className="card-header">Controls</div>
        <div className="card-content-compact">
          <div className="btn-grid btn-grid-3">
            {/* Undo Button */}
            <button
              onClick={actions.undo}
              disabled={state.history.length === 0}
              className="btn btn-secondary btn-sm"
              style={{
                opacity: state.history.length === 0 ? 0.5 : 1,
                cursor: state.history.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ↶ Undo
            </button>

            {/* Set Target Button */}
            <button
              onClick={() => setShowTargetModal(true)}
              className="btn btn-primary btn-sm"
            >
              🎯 Target
            </button>

            {/* Reset Button */}
            <button
              onClick={() => setShowResetModal(true)}
              className="btn btn-danger btn-sm"
            >
              🔄 Reset
            </button>
          </div>
          {/* Overs Presets and Custom */}
          <div className="overs-settings" style={{ marginTop: '0.75rem' }}>
            <div className="btn-grid btn-grid-4" style={{ marginBottom: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setOversInput('20'); actions.setOvers(20); }}>T20 (20)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setOversInput('50'); actions.setOvers(50); }}>ODI (50)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setOversInput('5'); actions.setOvers(5); }}>5</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setOversInput('10'); actions.setOvers(10); }}>10</button>
            </div>
            <div className="btn-grid btn-grid-3">
              <input
                type="number"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                placeholder="Custom overs"
                style={{ padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%' }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => actions.setOvers(parseInt(oversInput || '20', 10) || 20)}>Apply Overs</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setOversInput('15'); actions.setOvers(15); }}>15</button>
            </div>
          </div>
          {/* Team Settings */}
          <div className="team-settings" style={{ marginTop: '0.75rem' }}>
            <input
              type="text"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="Team A Name"
              style={{ padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%' }}
            />
            <input
              type="text"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="Team B Name"
              style={{ padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%' }}
            />
            <button
              onClick={() => { actions.setTeamName('A', teamA); actions.setTeamName('B', teamB); }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >Save Teams</button>
          </div>

          <button
            onClick={actions.switchTeam}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >Switch Innings</button>
        </div>
      </div>

      {/* Target Modal */}
      {showTargetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '300px', margin: 0 }}>
            <div className="card-header">Set Target</div>
            <div className="card-content">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Enter target score"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
                autoFocus
              />
              <input
                type="number"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                placeholder="Enter overs (e.g., 20)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
              <div className="btn-grid btn-grid-2">
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetTarget}
                  className="btn btn-primary btn-md"
                >
                  Set Target
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
            {/* Reset Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '300px', margin: 0 }}>
            <div className="card-header">Reset Match?</div>
            <div className="card-content">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                This will reset all scores and ball-by-ball data. This action cannot be undone.
              </p>
              <div className="btn-grid btn-grid-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="btn btn-danger btn-md"
                >
                  Reset Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};