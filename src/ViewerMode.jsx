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

  const badge = isConnected
    ? <span className="live-badge">LIVE</span>
    : null;

  return (
    <div className="app-container">
      <AppHeader
        showNav={false}
        subtitle={isConnected ? 'Streaming live from host' : 'Connecting to host…'}
        actions={badge}
      />

      <main className="main-content">
        {error && (
          <div className="card">
            <div className="state-card error">
              <span style={{ fontSize: '1.6rem' }}>⚠️</span>
              <span>{error}</span>
              <small>Check the link and ask the host to start broadcasting again.</small>
            </div>
          </div>
        )}

        {!isConnected && !error && (
          <div className="card">
            <div className="state-card">
              <div className="spinner" />
              <span>Connecting to live score…</span>
            </div>
          </div>
        )}

        {isConnected && viewerState && (
          <ViewerCricketProvider state={viewerState}>
            <div className="cricket-layout page-enter">
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
