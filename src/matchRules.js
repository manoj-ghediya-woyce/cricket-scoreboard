// Innings is over when overs run out, all out, or the chase target is reached
export const isInningsOver = (state) =>
  state.balls >= state.totalBalls ||
  state.wickets >= 10 ||
  (state.isTargetMode && !!state.target && state.score >= state.target);

// Box cricket powerplay length by match overs
export const POWERPLAY_BY_OVERS = { 8: 1, 10: 2, 12: 3 };

export const getPowerplayOvers = (totalOvers) => POWERPLAY_BY_OVERS[totalOvers] || 0;

// Fielders allowed outside the inner zone during the powerplay
export const POWERPLAY_FIELDERS_OUTSIDE = 1;
