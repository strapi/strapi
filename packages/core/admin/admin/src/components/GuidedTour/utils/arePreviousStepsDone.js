const arePreviousStepsDone = (step, guidedTourState) => {
  const stepSplit = step.split('.');
  const stepName = stepSplit[1];
  const sectionArray = Object.entries(guidedTourState[stepSplit[0]]);

  const currentStepIndex = sectionArray.findIndex(([key]) => key === stepName);
  const previousSteps = sectionArray.slice(0, currentStepIndex);

  return previousSteps.every(([, sectionValue]) => sectionValue);
};

export default arePreviousStepsDone;
