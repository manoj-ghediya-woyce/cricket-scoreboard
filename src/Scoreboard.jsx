import { useCricket } from './hooks/useCricket';

export const Scoreboard = () => {
  const { state } = useCricket();
  const battingTeamName = state.currentTeam === 'B' ? state.teamBName : state.teamAName;

  return (
    <div className="card">
      <div className="card-header">{battingTeamName} • Live Score</div>
      <div className="card-content-compact">
        <div className="scoreboard-compact">
          {/* Main Score */}
          <div className="main-score">
            <div className="main-score-number">
              {state.score}
              <span className="main-score-wickets">/{state.wickets}</span>
            </div>
            <div className="main-score-overs">({state.overs} of {(state.totalBalls/6)} overs)</div>
          </div>

          {/* Run Rate */}
          <div className="score-stat">
            <div className="score-stat-value">{state.runRate}</div>
            <div className="score-stat-label">Run Rate</div>
          </div>

          {/* Target or Strike Rate */}
          {state.target ? (
            <div className="score-stat">
              <div className="score-stat-value" style={{ color: '#d32f2f' }}>{state.requiredRunRate}</div>
              <div className="score-stat-label">Req. RR</div>
            </div>
          ) : (
            <div className="score-stat">
              <div className="score-stat-value">
                {state.balls > 0 ? ((state.score / state.balls) * 100).toFixed(0) : '0'}
              </div>
              <div className="score-stat-label">Strike Rate</div>
            </div>
          )}
        </div>

        {/* Target Status */}
        {state.target && (
          <div className={`target-status ${state.score >= state.target ? 'target-achieved' : ''}`}>
            {state.score >= state.target ? (
              <span>🎉 Target Achieved!</span>
            ) : (
              <span>
                Need {Math.max(0, state.target - state.score)} runs in {Math.max(0, state.totalBalls - state.balls)} balls
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};