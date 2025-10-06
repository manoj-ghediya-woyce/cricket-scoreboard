import { useState } from 'react';
import { useCricket } from './hooks/useCricket';

export const ControlPanel = () => {
  const { state, actions } = useCricket();
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const handleSetTarget = () => {
    const target = parseInt(targetInput);
    if (target > 0) {
      actions.setTarget(target);
      setShowTargetModal(false);
      setTargetInput('');
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