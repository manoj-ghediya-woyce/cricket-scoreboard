import { useCricket } from './hooks/useCricket';

export const BallByBall = () => {
  const { state } = useCricket();

  return (
    <div className="card">
      <div className="card-header">Ball by Ball</div>
      <div className="card-content">
        {state.ballByBall.length === 0 ? (
          <div className="text-center" style={{ color: 'var(--text-secondary)', padding: '2rem' }}>
            No balls bowled yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {state.ballByBall.map((ball, index) => {
              let ballClass = 'ball-indicator';
              
              if (ball.type === 'wicket') {
                ballClass += ' ball-wicket';
              } else if (ball.type === 'extra') {
                ballClass += ' ball-extra';
              } else if (ball.runs >= 4) {
                ballClass += ' ball-boundary';
              }
              
              return (
                <div
                  key={ball.id || index}
                  className={ballClass}
                >
                  {ball.value}
                </div>
              );
            })}
          </div>
        )}

        {/* Current Over Display */}
        {state.ballByBall.length > 0 && (
          <div className="current-over">
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Current Over:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {state.ballByBall
                .slice(-Math.min(10, state.ballByBall.length))
                .map((ball, index) => {
                  let ballClass = 'ball-mini';
                  
                  if (ball.type === 'wicket') {
                    ballClass += ' ball-mini-wicket';
                  } else if (ball.type === 'extra') {
                    ballClass += ' ball-mini-extra';
                  } else if (ball.runs >= 4) {
                    ballClass += ' ball-mini-boundary';
                  }
                  
                  return (
                    <span key={index} className={ballClass}>
                      {ball.value}
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};