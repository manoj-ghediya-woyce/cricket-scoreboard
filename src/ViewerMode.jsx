import { CricketContext } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { MatchStats } from './MatchStats';
import { AppHeader } from './AppHeader';
import { usePeerViewer } from './hooks/usePeerViewer';

const noOp = () => {};

// Wraps viewer state in the CricketContext shape so existing components work unchanged
const ViewerCricketProvider = ({ state, children }) => {
  const value = {
    state,
    actions: {
      addRuns: noOp, addWicket: noOp, addExtra: noOp,
      setTarget: noOp, setOvers: noOp, setTeamName: noOp,
      switchTeam: noOp, undo: noOp, reset: noOp,
    }
  };
  return (
    <CricketContext.Provider value={value}>
      {children}
    </CricketContext.Provider>
  );
};

export const ViewerMode = ({ hostPeerId }) => {
  const { viewerState, isConnected, error } = usePeerViewer(hostPeerId);

  const hasScore = !!viewerState;
  const badge = isConnected
    ? <span className="live-badge">LIVE</span>
    : hasScore ? <span className="reconnect-badge">Reconnecting</span> : null;

  return (
    <div className="app-container">
      <AppHeader
        showNav={false}
        subtitle={isConnected ? 'Streaming live from host' : 'Connecting to host…'}
        actions={badge}
      />

      <main className="main-content">
        {!hasScore && (
          <div className="card">
            <div className="state-card">
              <div className="spinner" />
              <span>{error ? `${error} — waiting for host…` : 'Connecting to live score…'}</span>
              {error && <small>The score will appear automatically when the host is back online.</small>}
            </div>
          </div>
        )}

        {hasScore && !isConnected && (
          <div className="reconnect-banner" role="status">
            <div className="spinner spinner-sm" />
            <span>
              <strong>{error || 'Connection lost'}</strong> — reconnecting automatically. Showing the last score received.
            </span>
          </div>
        )}

        {hasScore && (
          <ViewerCricketProvider state={viewerState}>
            <div className={`cricket-layout page-enter ${isConnected ? '' : 'is-stale'}`}>
              <div className="stack">
                <Scoreboard />
              </div>
              <div className="stack">
                <BallByBall />
                <MatchStats />
              </div>
            </div>
          </ViewerCricketProvider>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with ❤️ for cricket lovers · Woyce AI llp</p>
      </footer>
    </div>
  );
};
