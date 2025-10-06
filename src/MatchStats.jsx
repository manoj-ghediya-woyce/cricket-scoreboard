import { useCricket } from './hooks/useCricket';

export const MatchStats = () => {
  const { state } = useCricket();

  const stats = [
    {
      label: 'Balls Faced',
      value: state.balls,
      icon: '⚾'
    },
    {
      label: 'Boundaries',
      value: state.ballByBall.filter(ball => ball.runs >= 4).length,
      icon: '🏏'
    },
    {
      label: 'Sixes',
      value: state.ballByBall.filter(ball => ball.runs === 6).length,
      icon: '🚀'
    },
    {
      label: 'Dot Balls',
      value: state.ballByBall.filter(ball => ball.runs === 0 && ball.type !== 'wicket').length,
      icon: '⚪'
    }
  ];

  if (state.ballByBall.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">Match Statistics</div>
      <div className="card-content">
      
      <div className="grid-4">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item text-center">
            <div className="stat-icon">
              {stat.icon}
            </div>
            <div className="stat-value">
              {stat.value}
            </div>
            <div className="stat-label">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Strike Rate */}
      {state.balls > 0 && (
        <div className="strike-rate">
          <div className="stat-label">Strike Rate</div>
          <div className="stat-value">
            {((state.score / state.balls) * 100).toFixed(1)}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};