import { useCricket } from './hooks/useCricket';
import { getPowerplayOvers } from './matchRules';

export const Scoreboard = () => {
  const { state } = useCricket();
  const battingTeamName = state.currentTeam === 'B' ? state.teamBName : state.teamAName;
  const isInningsComplete = state.balls >= state.totalBalls || state.wickets >= 10;
  const totalOvers = state.totalBalls / 6;
  const ppOvers = getPowerplayOvers(totalOvers);
  const inPowerplay = ppOvers > 0 && state.balls < ppOvers * 6 && !isInningsComplete;
  const progress = Math.min(100, (state.balls / state.totalBalls) * 100);
  const strikeRate = state.balls > 0 ? ((state.score / state.balls) * 100).toFixed(0) : '0';

  let status = null;
  if (state.target) {
    const need = state.target - state.score;
    if (state.score >= state.target) {
      status = { cls: 'win', icon: '🎉', text: 'Target achieved!' };
    } else if (need === 1 && isInningsComplete) {
      status = { cls: '', icon: '🤝', text: 'Match tied — scores are level' };
    } else if (isInningsComplete) {
      const by = need - 1;
      status = { cls: 'loss', icon: '🏁', text: `Target missed — lost by ${by} run${by === 1 ? '' : 's'}` };
    } else {
      const left = Math.max(0, state.totalBalls - state.balls);
      status = { cls: '', icon: '🎯', text: `Need ${Math.max(0, need)} run${need === 1 ? '' : 's'} from ${left} ball${left === 1 ? '' : 's'}` };
    }
  } else if (isInningsComplete) {
    status = { cls: 'win', icon: '🏁', text: 'Innings complete' };
  }

  return (
    <section className="score-hero" aria-label="Live score">
      <div className="hero-top">
        <div className="hero-team">
          <span className="hero-chip"><span className="dot" />Batting</span>
          <span>{battingTeamName}</span>
        </div>
        {inPowerplay && (
          <span className="hero-chip pp" title={`Powerplay: first ${ppOvers} over${ppOvers > 1 ? 's' : ''}, 1 fielder outside`}>
            ⚡ Powerplay
          </span>
        )}
      </div>

      <div className="hero-body">
        <div>
          <div className="hero-score">
            <span className="hero-runs">{state.score}</span>
            <span className="hero-wkts">/{state.wickets}</span>
          </div>
          <div className="hero-overs">
            Overs <b>{state.overs}</b> <span style={{ opacity: .7 }}>/ {totalOvers}</span>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">{Number(state.runRate || 0).toFixed(2)}</div>
            <div className="hero-stat-label">Run rate</div>
          </div>
          {state.target ? (
            <div className="hero-stat alert">
              <div className="hero-stat-value">{Number(state.requiredRunRate || 0).toFixed(2)}</div>
              <div className="hero-stat-label">Req. RR</div>
            </div>
          ) : (
            <div className="hero-stat">
              <div className="hero-stat-value">{strikeRate}</div>
              <div className="hero-stat-label">Strike rate</div>
            </div>
          )}
          {state.target && (
            <div className="hero-stat">
              <div className="hero-stat-value">{state.target}</div>
              <div className="hero-stat-label">Target</div>
            </div>
          )}
        </div>
      </div>

      <div className="hero-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Innings progress">
        {ppOvers > 0 && <div className="hero-progress-pp" style={{ width: `${(ppOvers / totalOvers) * 100}%` }} />}
        <div className="hero-progress-bar" style={{ width: `${progress}%`, position: 'relative' }} />
      </div>

      {status && (
        <div className={`hero-status ${status.cls}`}>
          <span aria-hidden="true">{status.icon}</span>
          <span>{status.text}</span>
        </div>
      )}
    </section>
  );
};
