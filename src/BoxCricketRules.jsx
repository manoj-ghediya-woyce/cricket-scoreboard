import { useState } from 'react';
import { POWERPLAY_BY_OVERS, POWERPLAY_FIELDERS_OUTSIDE } from './matchRules';

const FORMATS = Object.keys(POWERPLAY_BY_OVERS).map(Number);

// Top-down box: outer net, inner zone (dashed), pitch, and fielder dots
const FieldDiagram = ({ outside }) => {
  const inner = [[48, 62], [102, 62], [40, 100], [110, 100], [75, 120], [60, 40]];
  const outer = [[18, 30], [132, 30], [16, 140], [134, 140], [75, 160]];
  return (
    <svg viewBox="0 0 150 180" aria-hidden="true">
      <rect x="3" y="3" width="144" height="174" rx="14" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />
      <rect x="30" y="30" width="90" height="120" rx="40" fill="currentColor" fillOpacity=".05" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="4 4" />
      <rect x="68" y="58" width="14" height="64" rx="2" fill="#c8a165" fillOpacity=".8" />
      {inner.slice(0, 6 - outside).map(([x, y], i) => <circle key={`i${i}`} cx={x} cy={y} r="5.5" fill="#14b8a6" />)}
      {outer.slice(0, outside).map(([x, y], i) => <circle key={`o${i}`} cx={x} cy={y} r="5.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />)}
    </svg>
  );
};

const Rule = ({ icon, tone = '', title, children }) => (
  <li>
    <span className={`rule-icon ${tone}`} aria-hidden="true">{icon}</span>
    <div><strong>{title}</strong>{children}</div>
  </li>
);

export const BoxCricketRules = () => {
  const [overs, setOvers] = useState(10);
  const pp = POWERPLAY_BY_OVERS[overs];

  return (
    <div className="page-enter">
      <section className="score-hero rules-hero">
        <span className="hero-chip">📘 Rulebook</span>
        <h1>Box Cricket Rules</h1>
        <p>Short-format house rules for indoor and box-net matches — powerplay, fielding, bowling, extras and dismissals at a glance.</p>
      </section>

      <div className="rules-grid">
        <div className="card span-2">
          <div className="card-header">Powerplay <span className="card-header-meta">Pick a format</span></div>
          <div className="card-content">
            <div className="pp-picker" role="tablist" aria-label="Match format">
              {FORMATS.map(o => (
                <button
                  key={o}
                  type="button"
                  role="tab"
                  aria-selected={overs === o}
                  className={`chip ${overs === o ? 'active' : ''}`}
                  onClick={() => setOvers(o)}
                >
                  {o} overs
                </button>
              ))}
            </div>

            <div className="over-strip" style={{ gridTemplateColumns: `repeat(${overs}, 1fr)` }}>
              {Array.from({ length: overs }).map((_, i) => (
                <div key={i} className={`over-cell ${i < pp ? 'pp' : ''}`}>{i + 1}</div>
              ))}
            </div>
            <div className="legend" style={{ marginBottom: '1rem' }}>
              <span><i className="pp" /> Powerplay ({pp} over{pp > 1 ? 's' : ''})</span>
              <span><i /> Normal overs</span>
            </div>

            <table className="pp-table">
              <thead>
                <tr><th>Match</th><th>Powerplay</th><th>Fielders outside</th></tr>
              </thead>
              <tbody>
                {FORMATS.map(o => (
                  <tr key={o} className={overs === o ? 'active' : ''}>
                    <td><span className="num">{o}</span> overs</td>
                    <td><span className="num">{POWERPLAY_BY_OVERS[o]}</span> over{POWERPLAY_BY_OVERS[o] > 1 ? 's' : ''} <span style={{ color: 'var(--text-3)' }}>({POWERPLAY_BY_OVERS[o] > 1 ? `overs 1–${POWERPLAY_BY_OVERS[o]}` : 'over 1'})</span></td>
                    <td><span className="num">{POWERPLAY_FIELDERS_OUTSIDE}</span> only</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Fielding restrictions</div>
          <div className="card-content">
            <div className="field-diagram">
              <div className="field-box pp">
                <FieldDiagram outside={POWERPLAY_FIELDERS_OUTSIDE} />
                <div className="field-box-title">During powerplay</div>
                <div className="field-box-sub">Only {POWERPLAY_FIELDERS_OUTSIDE} fielder outside the inner zone</div>
              </div>
              <div className="field-box">
                <FieldDiagram outside={3} />
                <div className="field-box-title">After powerplay</div>
                <div className="field-box-sub">Field opens up — set as agreed</div>
              </div>
            </div>
            <ul className="rule-list" style={{ marginTop: '.75rem' }}>
              <Rule icon="⚡" tone="e" title="Powerplay field">
                Only one player is allowed outside the inner zone; all others stay inside until the powerplay ends.
              </Rule>
              <Rule icon="🧤" title="Keeper & bowler">
                The wicket-keeper and bowler don't count toward the outside-fielder limit.
              </Rule>
              <Rule icon="🚫" tone="w" title="Field violation">
                Too many fielders outside during the powerplay — the delivery is called a no-ball.
              </Rule>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Teams & bowling</div>
          <div className="card-content">
            <ul className="rule-list">
              <Rule icon="👥" title="Squad size">
                6–8 players a side, decided before the toss. Both teams play the same number.
              </Rule>
              <Rule icon="🎳" title="Bowler quota">
                No bowler may bowl more than 2 overs in an 8 or 10-over match, or 3 overs in a 12-over match.
              </Rule>
              <Rule icon="🔁" title="Consecutive overs">
                A bowler can't bowl two overs in a row.
              </Rule>
              <Rule icon="✋" tone="w" title="Legal action">
                Overarm only. Throwing or underarm delivery is a no-ball.
              </Rule>
              <Rule icon="🧍" title="Last batter">
                The innings ends when one batter is left — no batting alone.
              </Rule>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Extras</div>
          <div className="card-content">
            <ul className="rule-list">
              <Rule icon="↔" tone="e" title="Wide">
                1 run + re-bowl. Includes balls passing down the leg side or over the batter's head.
              </Rule>
              <Rule icon="⛔" tone="e" title="No-ball">
                1 run + re-bowl, plus any runs scored off the bat. Waist-high full tosses and overstepping are no-balls.
              </Rule>
              <Rule icon="🆓" tone="b" title="Free hit">
                The next legal delivery after a no-ball is a free hit — the batter can only be run out.
              </Rule>
              <Rule icon="🦵" title="Byes & leg-byes">
                Count as extras and as a legal ball.
              </Rule>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Scoring & dismissals</div>
          <div className="card-content">
            <ul className="rule-list">
              <Rule icon="6" tone="b" title="Back net on the full">
                6 runs. Hitting the back net after a bounce scores 4.
              </Rule>
              <Rule icon="🕸" tone="w" title="Roof / top net">
                A ball that hits the roof net directly is out.
              </Rule>
              <Rule icon="🙌" tone="w" title="Catches">
                Clean catches are out. Catches taken off the side or back net are not out.
              </Rule>
              <Rule icon="🦿" title="No LBW">
                LBW isn't given. Bowled, caught, run out, stumped and hit-wicket all apply.
              </Rule>
            </ul>
          </div>
        </div>

        <div className="card span-2">
          <div className="card-header">Result</div>
          <div className="card-content">
            <ul className="rule-list">
              <Rule icon="🏆" title="Winner">
                Most runs wins. If the chasing side passes the target, the match ends immediately.
              </Rule>
              <Rule icon="🤝" tone="b" title="Tie">
                Scores level — play a one-over Super Over. Each team picks 2 batters and 1 bowler.
              </Rule>
            </ul>
            <div className="rules-note" style={{ marginTop: '.75rem' }}>
              <span aria-hidden="true">ℹ️</span>
              <span>House rules differ between venues. Captains should agree on any changes before the toss.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
