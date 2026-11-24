// Innings is over when overs run out, all out, or the chase target is reached
export const isInningsOver = (state) =>
  state.balls >= state.totalBalls ||
  state.wickets >= 10 ||
  (state.isTargetMode && !!state.target && state.score >= state.target);
