import { CricketProvider } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { ScoringButtons } from './ScoringButtons';
import { ControlPanel } from './ControlPanel';
import { MatchStats } from './MatchStats';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCricket } from './hooks/useCricket';

const TITLE_PREFIX = 'Cricket Live';

const TitleUpdater = () => {
  const { state } = useCricket();
  const completeOvers = (state.overs || '0.0').split('.')[0];

  // Update the tab title whenever score, wickets or overs change
  // Example: Woyce | 152/0 ( 25 )
  const title = `${TITLE_PREFIX} | ${state.score}/${state.wickets} ( ${completeOvers} )`;
  if (typeof document !== 'undefined' && document.title !== title) {
    document.title = title;
  }
  return null;
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
  return (
    <CricketProvider>
      <CricketApp />
    </CricketProvider>
  );
}

export default App;
