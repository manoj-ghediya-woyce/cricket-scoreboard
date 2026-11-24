import { useState, useEffect } from 'react';
import { useCricket } from './hooks/useCricket';
import { getPowerplayOvers } from './matchRules';

const OVERS_PRESETS = [
  { overs: 5, label: '5' },
  { overs: 8, label: '8', tag: 'BOX' },
  { overs: 10, label: '10', tag: 'BOX' },
  { overs: 12, label: '12', tag: 'BOX' },
  { overs: 20, label: 'T20' },
  { overs: 50, label: 'ODI' },
];

const Modal = ({ onClose, children, labelledBy }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
};

export const ControlPanel = () => {
  const { state, actions } = useCricket();
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const currentOvers = String(Math.round(state.totalBalls / 6));
  const [oversInput, setOversInput] = useState(currentOvers);
  const [teamA, setTeamA] = useState(state.teamAName || 'Team A');
  const [teamB, setTeamB] = useState(state.teamBName || 'Team B');

  // Sync team names from state when they change (e.g., on page reload)
  useEffect(() => {
    setTeamA(state.teamAName);
    setTeamB(state.teamBName);
  }, [state.teamAName, state.teamBName]);

  // Keep the overs field matching the match's real overs (reload, undo, presets)
  useEffect(() => {
    setOversInput(currentOvers);
  }, [currentOvers]);

  // Overs can't drop below what's been bowled; the reducer ignores that, so
  // reset the field first and let the sync effect show whatever was applied.
  const applyOvers = (overs) => {
    setOversInput(currentOvers);
    actions.setOvers(overs);
  };

  const openTargetModal = () => {
    setOversInput(currentOvers);
    setShowTargetModal(true);
  };

  const closeTargetModal = () => {
    setShowTargetModal(false);
    setOversInput(currentOvers);
  };

  const handleSetTarget = () => {
    const target = parseInt(targetInput, 10);
    const overs = parseInt(oversInput, 10);
    if (target > 0 && overs > 0) {
      actions.setTarget(target, overs);
      setShowTargetModal(false);
      setTargetInput('');
    }
  };

  const handleReset = () => {
    actions.reset();
    setShowResetModal(false);
  };

  const handleSaveTeams = () => {
    if (teamA.trim()) actions.setTeamName('A', teamA.trim());
    if (teamB.trim()) actions.setTeamName('B', teamB.trim());
  };

  const battingTeamName = state.currentTeam === 'B' ? state.teamBName : state.teamAName;
  const bowlingTeamName = state.currentTeam === 'B' ? state.teamAName : state.teamBName;
  const ppOvers = getPowerplayOvers(Number(currentOvers));

  return (
    <>
      <div className="card">
        <div className="card-header">Match controls</div>
        <div className="card-content-compact">
          <div className="control-group">
            <div className="btn-grid btn-grid-3">
              <button type="button" onClick={actions.undo} disabled={state.history.length === 0} className="btn btn-secondary btn-sm">
                ↶ Undo
              </button>
              <button type="button" onClick={openTargetModal} className="btn btn-soft btn-sm">
                🎯 Target
              </button>
              <button type="button" onClick={() => setShowResetModal(true)} className="btn btn-danger-soft btn-sm">
                ↻ Reset
              </button>
            </div>
            <button type="button" onClick={actions.switchTeam} className="btn btn-primary btn-sm btn-block" style={{ marginTop: '.5rem' }}>
              ⇄ Switch innings · {battingTeamName} → {bowlingTeamName}
            </button>
          </div>

          <div className="control-group overs-settings">
            <div className="section-label">
              Match overs
              {ppOvers > 0 && (
                <span style={{ color: 'var(--extra)', marginLeft: '.4rem' }}>
                  · ⚡ {ppOvers}-over powerplay
                </span>
              )}
            </div>
            <div className="chip-row">
              {OVERS_PRESETS.map(p => (
                <button
                  key={p.overs}
                  type="button"
                  className={`chip ${currentOvers === String(p.overs) ? 'active' : ''}`}
                  onClick={() => applyOvers(p.overs)}
                  aria-pressed={currentOvers === String(p.overs)}
                >
                  {p.label}{p.tag && <span className="chip-tag">{p.tag}</span>}
                </button>
              ))}
            </div>
            <div className="overs-custom">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min="1"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyOvers(parseInt(oversInput, 10) || 20); }}
                placeholder="Custom overs"
                aria-label="Custom overs"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyOvers(parseInt(oversInput, 10) || 20)}>
                Apply
              </button>
            </div>
          </div>

          <div className="control-group">
            <div className="section-label">Teams</div>
            <div className="team-settings">
              <input
                className="input"
                type="text"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                onBlur={handleSaveTeams}
                placeholder="Team A name"
                aria-label="Team A name"
              />
              <input
                className="input"
                type="text"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                onBlur={handleSaveTeams}
                placeholder="Team B name"
                aria-label="Team B name"
              />
              <button type="button" onClick={handleSaveTeams} className="btn btn-secondary btn-sm">Save</button>
            </div>
          </div>
        </div>
      </div>

      {showTargetModal && (
        <Modal onClose={closeTargetModal} labelledBy="target-title">
          <div className="modal-icon">🎯</div>
          <h2 className="modal-title" id="target-title">Set target</h2>
          <p className="modal-desc">Switch to chase mode with a target score.</p>
          <div className="modal-body">
            <label className="field">
              <span className="field-label">Target runs</span>
              <input
                className="input input-lg"
                type="number"
                inputMode="numeric"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSetTarget(); }}
                placeholder="e.g. 96"
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Overs</span>
              <input
                className="input input-lg"
                type="number"
                inputMode="numeric"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSetTarget(); }}
                placeholder="e.g. 10"
              />
            </label>
          </div>
          <div className="btn-grid btn-grid-2">
            <button type="button" onClick={closeTargetModal} className="btn btn-secondary btn-md">Cancel</button>
            <button type="button" onClick={handleSetTarget} className="btn btn-primary btn-md">Set target</button>
          </div>
        </Modal>
      )}

      {showResetModal && (
        <Modal onClose={() => setShowResetModal(false)} labelledBy="reset-title">
          <div className="modal-icon danger">↻</div>
          <h2 className="modal-title" id="reset-title">Reset match?</h2>
          <p className="modal-desc">All scores and ball-by-ball data will be cleared. This can't be undone.</p>
          <div className="btn-grid btn-grid-2">
            <button type="button" onClick={() => setShowResetModal(false)} className="btn btn-secondary btn-md">Cancel</button>
            <button type="button" onClick={handleReset} className="btn btn-danger btn-md">Reset match</button>
          </div>
        </Modal>
      )}
    </>
  );
};
