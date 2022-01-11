export const isGuidedTourComplete = guidedTourState =>
  Object.entries(guidedTourState).every(([, section]) =>
    Object.entries(section).every(([, step]) => step)
  );
