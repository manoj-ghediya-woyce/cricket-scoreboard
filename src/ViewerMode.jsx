import { CricketContext } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { MatchStats } from './MatchStats';
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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="header-title">Woyce Technologies</h1>
          <p className="header-subtitle">
            {isConnected ? '🔴 Live • Streaming from host' : '🔗 Connecting to host...'}
          </p>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="viewer-error-card">
            <span>❌ {error}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Check the link and ask the host to start broadcasting again.</span>
          </div>
        )}

        {!isConnected && !error && (
          <div className="viewer-connecting-card">
            <span className="pulse">⏳</span>
            <span>Connecting to live score…</span>
          </div>
        )}

        {isConnected && viewerState && (
          <ViewerCricketProvider state={viewerState}>
            <div className="cricket-layout">
              <div>
                <Scoreboard />
              </div>
              <div>
                <BallByBall />
                <MatchStats />
              </div>
            </div>
          </ViewerCricketProvider>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with ❤️ for cricket lovers</p>
      </footer>
    </div>
  );
};
