import { createContext, useReducer, useEffect } from 'react';
import { idbGet, idbSet } from './idb';

// Initial state
const initialState = {
  score: 0,
  wickets: 0,
  balls: 0,
  overs: "0.0",
  target: null,
  history: [],
  ballByBall: [],
  runRate: 0,
  requiredRunRate: 0,
  ballsRemaining: 0,
  isTargetMode: false
};

// Action types
const ACTIONS = {
  ADD_RUNS: 'ADD_RUNS',
  ADD_WICKET: 'ADD_WICKET',
  ADD_EXTRA: 'ADD_EXTRA',
  SET_TARGET: 'SET_TARGET',
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
      const newScore = state.score + runs;
      const newOvers = calculateOvers(newBalls);
      const newRunRate = calculateRunRate(newScore, newBalls);
      const ballsRemaining = state.isTargetMode ? (120 - newBalls) : 0; // Assuming 20 overs max
      const newRequiredRunRate = calculateRequiredRunRate(state.target, newScore, ballsRemaining);
      
      const ballDisplay = isExtra && extraType ? `${runs}(${extraType})` : runs.toString();
      
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
      const newOvers = calculateOvers(newBalls);
      const newWickets = state.wickets + 1;
      const ballsRemaining = state.isTargetMode ? (120 - newBalls) : 0;
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
      const ballsRemaining = state.isTargetMode ? (120 - newBalls) : 0;
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
          value: `${runs}(${type})`, 
          runs,
          isExtra: true,
          countsBall,
          id: Date.now()
        }]
      });
    }

    case ACTIONS.SET_TARGET: {
      return {
        ...state,
        target: action.payload,
        isTargetMode: true,
        ballsRemaining: 120 // 20 overs
      };
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

  const setTarget = (target) => {
    dispatch({ type: ACTIONS.SET_TARGET, payload: target });
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