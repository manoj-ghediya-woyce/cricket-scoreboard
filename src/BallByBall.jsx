import { useCricket } from './hooks/useCricket';

const ballClass = (ball) => {
  if (ball.type === 'wicket') return 'ball ball-wicket';
  if (ball.type === 'extra') return 'ball ball-extra';
  if (ball.runs === 6) return 'ball ball-six';
  if (ball.runs === 4) return 'ball ball-four';
  if (ball.runs === 0) return 'ball ball-dot';
  return 'ball';
};

// Group balls by overs (6 legal deliveries = 1 over)
const groupOvers = (ballByBall) => {
  const overs = [];
  let currentOver = [];
  let legalBalls = 0;

  ballByBall.forEach((ball) => {
    currentOver.push(ball);
    if (ball.countsBall !== false) legalBalls++;
    if (legalBalls === 6) {
      overs.push(currentOver);
      currentOver = [];
      legalBalls = 0;
    }
  });
  if (currentOver.length > 0) overs.push(currentOver);
  return overs;
};

export const BallByBall = () => {
  const { state } = useCricket();
  const oversData = groupOvers(state.ballByBall);

  // When the last over is complete, the "current" over is a fresh empty one
  const lastLegal = oversData.length
    ? oversData[oversData.length - 1].filter(b => b.countsBall !== false).length
    : 0;
  const lastIsComplete = lastLegal === 6;
  const currentOverBalls = !lastIsComplete && oversData.length ? oversData[oversData.length - 1] : [];
  const completedOvers = lastIsComplete ? oversData : oversData.slice(0, -1);
  const legalInCurrent = currentOverBalls.filter(b => b.countsBall !== false).length;
  const currentOverRuns = currentOverBalls.reduce((s, b) => s + (b.runs || 0), 0);

  return (
    <div className="card">
      <div className="card-header">
        Ball by ball
        {state.ballByBall.length > 0 && <span className="card-header-meta num">Over {state.overs}</span>}
      </div>
      <div className="card-content">
        {state.ballByBall.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏏</div>
            No balls bowled yet
          </div>
        ) : (
          <>
            <div className="over-current">
              <div className="over-current-head">
                <span>This over</span>
                <span className="num">{currentOverRuns} run{currentOverRuns === 1 ? '' : 's'}</span>
              </div>
              <div className="ball-row">
                {currentOverBalls.map((ball, index) => (
                  <span key={ball.id || index} className={ballClass(ball)}>{ball.value}</span>
                ))}
                {Array.from({ length: Math.max(0, 6 - legalInCurrent) }).map((_, i) => (
                  <span key={`e${i}`} className="ball ball-empty" aria-hidden="true">·</span>
                ))}
              </div>
            </div>

            {completedOvers.length > 0 && (
              <div className="overs-history">
                {completedOvers.map((over, overIndex) => ({ over, overIndex })).reverse().map(({ over, overIndex }) => (
                  <div key={overIndex} className="over-line">
                    <span className="over-no">Ov {overIndex + 1}</span>
                    <div className="ball-row" style={{ gap: '.25rem' }}>
                      {over.map((ball, ballIndex) => (
                        <span key={ball.id || ballIndex} className={ballClass(ball)}>{ball.value}</span>
                      ))}
                    </div>
                    <span className="over-total">{over.reduce((s, b) => s + (b.runs || 0), 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
