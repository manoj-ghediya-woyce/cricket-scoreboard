import { createContext, useReducer, useEffect } from 'react';
import { idbGet, idbSet } from './idb';

// Initial state
const initialState = {
  score: 0,
  wickets: 0,
  balls: 0,
  overs: "0.0",
  target: null,
  totalBalls: 120,
  history: [],
  ballByBall: [],
  runRate: 0,
  requiredRunRate: 0,
  ballsRemaining: 0,
  isTargetMode: false,
  teamAName: 'Team A',
  teamBName: 'Team B',
  currentTeam: 'A',
  // Store both innings data
  inningsA: { score: 0, wickets: 0, balls: 0, overs: "0.0", ballByBall: [] },
  inningsB: { score: 0, wickets: 0, balls: 0, overs: "0.0", ballByBall: [] }
};

// Action types
const ACTIONS = {
  ADD_RUNS: 'ADD_RUNS',
  ADD_WICKET: 'ADD_WICKET',
  ADD_EXTRA: 'ADD_EXTRA',
  SET_TARGET: 'SET_TARGET',
  SET_OVERS: 'SET_OVERS',
  SET_TEAM_NAME: 'SET_TEAM_NAME',
  SWITCH_TEAM: 'SWITCH_TEAM',
  UNDO: 'UNDO',
  RESET: 'RESET',
  LOAD_STATE: 'LOAD_STATE'
};

// Utility functions
const calculateOvers = (balls) => {
  const completeOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${completeOvers}.${remainingBalls}`;
};

const calculateRunRate = (runs, balls) => {
  if (balls === 0) return 0;
  return ((runs / balls) * 6).toFixed(2);
};

const calculateRequiredRunRate = (target, currentRuns, ballsRemaining) => {
  if (!target || ballsRemaining === 0) return 0;
  const runsNeeded = target - currentRuns;
  if (runsNeeded <= 0) return 0;
  return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
};

// Reducer function
const cricketReducer = (state, action) => {
  const saveToHistory = (newState) => ({
    ...newState,
    history: [...state.history, { ...state }]
  });

  switch (action.type) {
    case ACTIONS.ADD_RUNS: {
      const { runs, isExtra = false, extraType = null } = action.payload;
      // Count ball for normal runs, dot balls, wickets (handled elsewhere), and byes/leg-byes
      const countsBall = !isExtra || extraType === 'bye' || extraType === 'leg-bye';
      const newBalls = countsBall ? state.balls + 1 : state.balls;
      
      // Prevent adding balls beyond the over limit
      if (newBalls > state.totalBalls) {
        return state;
      }
      const newScore = state.score + runs;
      const newOvers = calculateOvers(newBalls);
      const newRunRate = calculateRunRate(newScore, newBalls);
      const ballsRemaining = state.isTargetMode ? (state.totalBalls - newBalls) : 0;
      const newRequiredRunRate = calculateRequiredRunRate(state.target, newScore, ballsRemaining);
      
      const toAbbrev = (t) => t === 'no-ball' ? 'Nb' : t === 'wide' ? 'Wd' : t === 'bye' ? 'B' : t === 'leg-bye' ? 'Lb' : t;
      const ballDisplay = isExtra && extraType ? `${toAbbrev(extraType)}${runs > 1 ? `${extraType === 'no-ball' ? `+${runs-1}` : runs}` : ''}` : runs.toString();
      
      return saveToHistory({
        ...state,
        score: newScore,
        balls: newBalls,
        overs: newOvers,
        runRate: parseFloat(newRunRate),
        requiredRunRate: parseFloat(newRequiredRunRate),
        ballsRemaining,
        ballByBall: [...state.ballByBall, { 
          type: isExtra ? 'extra' : 'runs', 
          value: ballDisplay, 
          runs, 
          isExtra,
          countsBall,
          id: Date.now()
        }]
      });
    }

    case ACTIONS.ADD_WICKET: {
      const newBalls = state.balls + 1;
      
      // Prevent adding balls beyond the over limit
      if (newBalls > state.totalBalls) {
        return state;
      }
      
      const newOvers = calculateOvers(newBalls);
      const newWickets = state.wickets + 1;
      const ballsRemaining = state.isTargetMode ? (state.totalBalls - newBalls) : 0;
      const newRequiredRunRate = calculateRequiredRunRate(state.target, state.score, ballsRemaining);

      return saveToHistory({
        ...state,
        wickets: newWickets,
        balls: newBalls,
        overs: newOvers,
        requiredRunRate: parseFloat(newRequiredRunRate),
        ballsRemaining,
        ballByBall: [...state.ballByBall, { 
          type: 'wicket', 
          value: 'W', 
          runs: 0,
          id: Date.now()
        }]
      });
    }

    case ACTIONS.ADD_EXTRA: {
      const { type, runs = 1 } = action.payload;
      // Byes and Leg-byes are legal deliveries and should count as a ball
      const countsBall = type === 'bye' || type === 'leg-bye';
      const newBalls = countsBall ? state.balls + 1 : state.balls;
      const newScore = state.score + runs;
      const newOvers = calculateOvers(newBalls);
      const newRunRate = calculateRunRate(newScore, newBalls);
      const ballsRemaining = state.isTargetMode ? (state.totalBalls - newBalls) : 0;
      const newRequiredRunRate = calculateRequiredRunRate(state.target, newScore, ballsRemaining);

      return saveToHistory({
        ...state,
        score: newScore,
        balls: newBalls,
        overs: newOvers,
        runRate: parseFloat(newRunRate),
        requiredRunRate: parseFloat(newRequiredRunRate),
        ballsRemaining,
        ballByBall: [...state.ballByBall, { 
          type: 'extra', 
          value: `${(type === 'no-ball' ? 'Nb' : type === 'wide' ? 'Wd' : type === 'bye' ? 'B' : type === 'leg-bye' ? 'Lb' : type)}${runs > 1 ? `${type === 'no-ball' ? `+${runs-1}` : runs}` : ''}` , 
          runs,
          isExtra: true,
          countsBall,
          id: Date.now()
        }]
      });
    }

    case ACTIONS.SET_TARGET: {
      const { target, overs = 20 } = action.payload || {};
      const totalBalls = Math.max(1, parseInt(overs, 10) || 20) * 6;
      const ballsRemaining = Math.max(0, totalBalls - state.balls);
      const newRequiredRunRate = calculateRequiredRunRate(target, state.score, ballsRemaining);
      return {
        ...state,
        target,
        isTargetMode: true,
        totalBalls,
        ballsRemaining,
        requiredRunRate: parseFloat(newRequiredRunRate)
      };
    }

    case ACTIONS.SET_OVERS: {
      const { overs } = action.payload || {};
      const totalBalls = Math.max(1, parseInt(overs, 10) || 20) * 6;
      return {
        ...state,
        totalBalls,
        ballsRemaining: Math.max(0, totalBalls - state.balls)
      };
    }

    case ACTIONS.SET_TEAM_NAME: {
      const { team, name } = action.payload;
      if (team !== 'A' && team !== 'B') return state;
      return saveToHistory({
        ...state,
        teamAName: team === 'A' ? name : state.teamAName,
        teamBName: team === 'B' ? name : state.teamBName
      });
    }

    case ACTIONS.SWITCH_TEAM: {
      const currentInningsKey = state.currentTeam === 'A' ? 'inningsA' : 'inningsB';
      const newTeam = state.currentTeam === 'A' ? 'B' : 'A';
      const newInningsKey = newTeam === 'A' ? 'inningsA' : 'inningsB';
      
      // Save current innings data
      const savedCurrentInnings = {
        score: state.score,
        wickets: state.wickets,
        balls: state.balls,
        overs: state.overs,
        ballByBall: state.ballByBall
      };
      
      // Get the other innings data
      const otherInnings = state[newInningsKey];
      
      // Check if we're switching to second innings (current innings has balls bowled but other innings is empty)
      const isFirstInningsComplete = state.balls > 0 && otherInnings.balls === 0;
      const targetScore = isFirstInningsComplete ? state.score + 1 : null;
      const ballsRemaining = isFirstInningsComplete ? state.totalBalls : 0;
      const newRequiredRunRate = isFirstInningsComplete ? calculateRequiredRunRate(targetScore, 0, ballsRemaining) : 0;
      
      return saveToHistory({
        ...state,
        [currentInningsKey]: savedCurrentInnings,
        currentTeam: newTeam,
        score: otherInnings.score,
        wickets: otherInnings.wickets,
        balls: otherInnings.balls,
        overs: otherInnings.overs,
        ballByBall: otherInnings.ballByBall,
        runRate: calculateRunRate(otherInnings.score, otherInnings.balls),
        // Automatically set target mode when switching to second innings
        target: targetScore,
        isTargetMode: isFirstInningsComplete,
        requiredRunRate: parseFloat(newRequiredRunRate),
        ballsRemaining
      });
    }

    case ACTIONS.UNDO: {
      if (state.history.length === 0) return state;
      const previousState = state.history[state.history.length - 1];
      return {
        ...previousState,
        history: state.history.slice(0, -1)
      };
    }

    case ACTIONS.RESET: {
      return { ...initialState };
    }

    case ACTIONS.LOAD_STATE: {
      return { ...action.payload };
    }

    default:
      return state;
  }
};

// Context
export const CricketContext = createContext();

// Provider component
export const CricketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cricketReducer, initialState);

  // Load state from IndexedDB (with one-time migration from localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idbState = await idbGet('cricketScoreboard');
        if (idbState) {
          if (!cancelled) dispatch({ type: ACTIONS.LOAD_STATE, payload: idbState });
          return;
        }
        const ls = localStorage.getItem('cricketScoreboard');
        if (ls) {
          try {
            const parsed = JSON.parse(ls);
            await idbSet('cricketScoreboard', parsed);
            if (!cancelled) dispatch({ type: ACTIONS.LOAD_STATE, payload: parsed });
            // Optionally clear localStorage to prevent quota issues
            localStorage.removeItem('cricketScoreboard');
          } catch (_) {
            // ignore invalid localStorage
          }
        }
      } catch (e) {
        console.error('Error loading state from IndexedDB:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist to IndexedDB whenever state changes
  useEffect(() => {
    (async () => {
      try {
        await idbSet('cricketScoreboard', state);
      } catch (e) {
        console.error('Error saving state to IndexedDB:', e);
      }
    })();
  }, [state]);

  const addRuns = (runs, isExtra = false, extraType = null) => {
    dispatch({ 
      type: ACTIONS.ADD_RUNS, 
      payload: { runs, isExtra, extraType } 
    });
  };

  const addWicket = () => {
    dispatch({ type: ACTIONS.ADD_WICKET });
  };

  const addExtra = (type, runs = 1) => {
    dispatch({ 
      type: ACTIONS.ADD_EXTRA, 
      payload: { type, runs } 
    });
  };

  const setTarget = (target, overs = 20) => {
    dispatch({ type: ACTIONS.SET_TARGET, payload: { target, overs } });
  };

  const setOvers = (overs) => {
    dispatch({ type: ACTIONS.SET_OVERS, payload: { overs } });
  };

  const setTeamName = (team, name) => {
    dispatch({ type: ACTIONS.SET_TEAM_NAME, payload: { team, name } });
  };

  const switchTeam = () => {
    dispatch({ type: ACTIONS.SWITCH_TEAM });
  };

  const undo = () => {
    dispatch({ type: ACTIONS.UNDO });
  };

  const reset = () => {
    dispatch({ type: ACTIONS.RESET });
  };

  const value = {
    state,
    actions: {
      addRuns,
      addWicket,
      addExtra,
      setTarget,
      setOvers,
      setTeamName,
      switchTeam,
      undo,
      reset
    }
  };

  return (
    <CricketContext.Provider value={value}>
      {children}
    </CricketContext.Provider>
  );
};