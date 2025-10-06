import { CricketProvider } from './CricketContext';
import { Scoreboard } from './Scoreboard';
import { BallByBall } from './BallByBall';
import { ScoringButtons } from './ScoringButtons';
import { ControlPanel } from './ControlPanel';
import { MatchStats } from './MatchStats';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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
