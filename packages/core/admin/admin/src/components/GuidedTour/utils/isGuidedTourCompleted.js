const isGuidedTourCompleted = (guidedTourState) =>
  Object.entries(guidedTourState).every(([, section]) =>
    Object.entries(section).every(([, step]) => step)
  );

export default isGuidedTourCompleted;
