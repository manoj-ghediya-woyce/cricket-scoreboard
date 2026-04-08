import { useState } from 'react';
import { CricketProvider } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { ScoringButtons } from './ScoringButtons';
import { ControlPanel } from './ControlPanel';
import { MatchStats } from './MatchStats';
import { ViewerMode } from './ViewerMode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCricket } from './hooks/useCricket';
import { usePeerHost } from './hooks/usePeerHost';

const TITLE_PREFIX = 'Cricket Live';

const TitleUpdater = () => {
  const { state } = useCricket();
  const completeOvers = (state.overs || '0.0').split('.')[0];
  const title = `${TITLE_PREFIX} | ${state.score}/${state.wickets} ( ${completeOvers} )`;
  if (typeof document !== 'undefined' && document.title !== title) {
    document.title = title;
  }
  return null;
};

const HostingBar = () => {
  const { state } = useCricket();
  const { shareUrl, isHosting, startHosting, stopHosting, connectionCount, error } = usePeerHost(state);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="hosting-bar">
      {!isHosting ? (
        <button className="btn btn-host btn-sm" onClick={startHosting}>
          📡 Host Live Score
        </button>
      ) : (
        <div className="hosting-active">
          <div className="hosting-meta">
            <span className="live-badge">● LIVE</span>
            <span className="hosting-viewers">
              {connectionCount} viewer{connectionCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="hosting-url-row">
            <input
              className="hosting-url-input"
              value={shareUrl || ''}
              readOnly
              onClick={e => e.target.select()}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={stopHosting}>
              Stop
            </button>
          </div>
          {error && <p className="hosting-error">⚠️ {error}</p>}
        </div>
      )}
    </div>
  );
};

const CricketApp = () => {
  useKeyboardShortcuts();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="header-title">Woyce Technologies</h1>
          <p className="header-subtitle">Smart, real-time cricket scoring made simple.</p>
        </div>
        <HostingBar />
      </header>

      <main className="main-content">
        <TitleUpdater />
        <div className="cricket-layout">
          <div>
            <Scoreboard />
            <ScoringButtons />
            <ControlPanel />
          </div>
          <div>
            <BallByBall />
            <MatchStats />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with ❤️ for cricket lovers</p>
      </footer>
    </div>
  );
};

function App() {
  const params = new URLSearchParams(window.location.search);
  const hostPeerId = params.get('peer');

  if (hostPeerId) {
    return <ViewerMode hostPeerId={hostPeerId} />;
  }

  return (
    <CricketProvider>
      <CricketApp />
    </CricketProvider>
  );
}

export default App;
