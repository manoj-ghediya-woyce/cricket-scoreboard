import { useEffect, useState } from 'react';
import { CricketProvider } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { ScoringButtons } from './ScoringButtons';
import { ControlPanel } from './ControlPanel';
import { MatchStats } from './MatchStats';
import { ViewerMode } from './ViewerMode';
import { AppHeader } from './AppHeader';
import { BoxCricketRules } from './BoxCricketRules';
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

// Tiny hash router: #/ → score, #/rules → box cricket rules
const readRoute = () => (window.location.hash.replace(/^#\/?/, '') === 'rules' ? 'rules' : 'score');

const useHashRoute = () => {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without clipboard API
    const el = document.createElement('input');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
};

const CricketApp = () => {
  const route = useHashRoute();
  useKeyboardShortcuts(route === 'score');

  const { state } = useCricket();
  const { shareUrl, isHosting, status, startHosting, stopHosting, connectionCount, error } = usePeerHost(state);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await copyText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hostButton = !isHosting && (
    <button type="button" className="btn btn-host btn-sm" onClick={startHosting} title="Share a live link to this score">
      <span className="live-dot" aria-hidden="true" /> Go live
    </button>
  );

  return (
    <div className="app-container">
      <AppHeader route={route} actions={hostButton}>
        {isHosting && (
          <div className="hosting-panel">
            <div className="hosting-active">
              <div className="hosting-meta">
                {status === 'live' ? (
                  <span className="live-badge">LIVE</span>
                ) : (
                  <span className="reconnect-badge">{status === 'connecting' ? 'Starting' : 'Reconnecting'}</span>
                )}
                <span className="hosting-viewers">
                  {status === 'live'
                    ? `${connectionCount} viewer${connectionCount !== 1 ? 's' : ''}`
                    : 'Link stays the same — viewers rejoin automatically'}
                </span>
              </div>
              <div className="hosting-url-row">
                <input
                  className="input hosting-url-input"
                  value={shareUrl || ''}
                  readOnly
                  onClick={e => e.target.select()}
                  aria-label="Share link"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
                <button type="button" className="btn btn-danger-soft btn-sm" onClick={stopHosting}>
                  Stop
                </button>
              </div>
              {error && <p className="hosting-error">⚠️ {error}</p>}
            </div>
          </div>
        )}
        {!isHosting && error && (
          <p className="hosting-error hosting-error-inline">⚠️ Hosting stopped: {error}</p>
        )}
      </AppHeader>

      <main className="main-content">
        <TitleUpdater />
        {route === 'rules' ? (
          <BoxCricketRules />
        ) : (
          <div className="cricket-layout page-enter">
            <div className="stack">
              <Scoreboard />
              <ScoringButtons />
              <ControlPanel />
            </div>
            <div className="stack stack-sticky">
              <BallByBall />
              <MatchStats />
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        {route === 'score' && (
          <p className="shortcut-hint">
            Shortcuts: <kbd>0</kbd>–<kbd>6</kbd> runs · <kbd>W</kbd> wicket · <kbd>U</kbd> undo
          </p>
        )}
        <p>Built with ❤️ for cricket lovers · Woyce AI llp</p>
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
