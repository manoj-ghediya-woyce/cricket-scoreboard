import { ThemeToggle } from './ThemeToggle';

const BallIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#ef4444" />
    <path d="M7.5 4.6c2.2 4.4 2.2 10.4 0 14.8M16.5 4.6c-2.2 4.4-2.2 10.4 0 14.8" stroke="#fee2e2" strokeWidth="1.2" strokeDasharray="1.6 1.6" fill="none" />
  </svg>
);

const ScoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>
);
const RulesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M8 9h8M8 13h6" /></svg>
);

export const AppHeader = ({ subtitle = 'Smart, real-time cricket scoring', route, showNav = true, actions, children }) => (
  <header className="app-header">
    <div className="header-inner">
      <a className="brand" href="#/" aria-label="Woyce AI cricket scoreboard home">
        <span className="brand-mark"><BallIcon /></span>
        <span className="brand-text">
          <span className="brand-title">Woyce AI</span>
          <span className="brand-sub">{subtitle}</span>
        </span>
      </a>

      {showNav ? (
        <nav className="nav-tabs" aria-label="Main">
          <a className={`nav-tab ${route === 'score' ? 'active' : ''}`} href="#/" aria-current={route === 'score' ? 'page' : undefined}>
            <ScoreIcon /> Score
          </a>
          <a className={`nav-tab ${route === 'rules' ? 'active' : ''}`} href="#/rules" aria-current={route === 'rules' ? 'page' : undefined}>
            <RulesIcon /> <span><span className="tab-label-long">Box Cricket </span>Rules</span>
          </a>
        </nav>
      ) : <span style={{ marginLeft: 'auto' }} />}

      <div className="header-actions">
        {actions}
        <ThemeToggle />
      </div>
    </div>
    {children}
  </header>
);
