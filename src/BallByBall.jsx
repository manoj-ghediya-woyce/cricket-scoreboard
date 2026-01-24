import { useCricket } from './hooks/useCricket';

export const BallByBall = () => {
  const { state } = useCricket();

  // Group balls by overs (6 legal deliveries = 1 over)
  const getOversData = () => {
    const overs = [];
    let currentOver = [];
    let legalBalls = 0;

    state.ballByBall.forEach((ball) => {
      currentOver.push(ball);
      // Count legal deliveries (not wides or no-balls)
      if (ball.countsBall !== false) {
        legalBalls++;
      }
      // After 6 legal balls, start a new over
      if (legalBalls === 6) {
        overs.push(currentOver);
        currentOver = [];
        legalBalls = 0;
      }
    });

    // Add remaining balls as current over
    if (currentOver.length > 0) {
      overs.push(currentOver);
    }

    return overs;
  };

  const oversData = getOversData();
  const currentOverBalls = oversData.length > 0 ? oversData[oversData.length - 1] : [];
  const completedOvers = Math.floor(state.balls / 6);

  return (
    <div className="card">
      <div className="card-header">
        Ball by Ball
        {state.ballByBall.length > 0 && (
          <span style={{ float: 'right', fontWeight: 'normal', fontSize: '0.75rem', color: '#757575' }}>
            Over {completedOvers}.{state.balls % 6}
          </span>
        )}
      </div>
      <div className="card-content">
        {state.ballByBall.length === 0 ? (
          <div className="text-center" style={{ color: 'var(--text-secondary)', padding: '1.5rem' }}>
            No balls bowled yet
          </div>
        ) : (
          <>
            {/* Current Over Display */}
            <div className="current-over" style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem', fontWeight: 500 }}>
                Current Over ({currentOverBalls.filter(b => b.countsBall !== false).length}/6)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {currentOverBalls.map((ball, index) => {
                  let ballClass = 'ball-indicator';
                  
                  if (ball.type === 'wicket') {
                    ballClass += ' ball-wicket';
                  } else if (ball.type === 'extra') {
                    ballClass += ' ball-extra';
                  } else if (ball.runs >= 4) {
                    ballClass += ' ball-boundary';
                  }
                  
                  return (
                    <div key={ball.id || index} className={ballClass}>
                      {ball.value}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous Overs Timeline */}
            {oversData.length > 1 && (
              <>
                <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Previous Overs
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                  {oversData.slice(0, -1).map((over, overIndex) => (
                    <div key={overIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {over.map((ball, ballIndex) => {
                        let ballClass = 'ball-mini';
                        
                        if (ball.type === 'wicket') {
                          ballClass += ' ball-mini-wicket';
                        } else if (ball.type === 'extra') {
                          ballClass += ' ball-mini-extra';
                        } else if (ball.runs >= 4) {
                          ballClass += ' ball-mini-boundary';
                        }
                        
                        return (
                          <span key={ball.id || ballIndex} className={ballClass}>
                            {ball.value}
                          </span>
                        );
                      })}
                      {overIndex < oversData.length - 2 && (
                        <span style={{ margin: '0 0.2rem', color: '#ccc' }}>|</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
