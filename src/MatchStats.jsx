import { useCricket } from './hooks/useCricket';

export const MatchStats = () => {
  const { state } = useCricket();

  if (state.ballByBall.length === 0) return null;

  const balls = state.ballByBall;
  const stats = [
    { label: 'Fours', value: balls.filter(b => b.type === 'runs' && b.runs === 4).length, cls: 't-four' },
    { label: 'Sixes', value: balls.filter(b => b.type === 'runs' && b.runs === 6).length, cls: 't-six' },
    { label: 'Dot balls', value: balls.filter(b => b.runs === 0 && b.type !== 'wicket').length },
    { label: 'Extras', value: balls.filter(b => b.type === 'extra').reduce((s, b) => s + (b.runs || 0), 0), cls: 't-extra' },
    { label: 'Balls bowled', value: state.balls },
    { label: 'Strike rate', value: state.balls > 0 ? ((state.score / state.balls) * 100).toFixed(1) : '0.0' }
  ];

  return (
    <div className="card">
      <div className="card-header">Innings stats</div>
      <div className="card-content">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className={`stat-tile ${stat.cls || ''}`}>
              <div className="stat-tile-value">{stat.value}</div>
              <div className="stat-tile-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
