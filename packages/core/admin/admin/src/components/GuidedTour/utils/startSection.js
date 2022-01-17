import get from 'lodash/get';
import arePreviousSectionsDone from './arePreviousSectionsDone';

const startSection = (sectionName, guidedTourState, currentStep, setCurrentStep) => {
  const isSectionToShow = arePreviousSectionsDone(sectionName, guidedTourState);

  const sectionSteps = get(guidedTourState, sectionName);
  const firstStep = Object.keys(sectionSteps)[0];
  const isFirstStepDone = sectionSteps[firstStep];

  if (isSectionToShow && !currentStep && !isFirstStepDone) {
    return setCurrentStep(`${sectionName}.${firstStep}`);
  }

  return null;
};

export default startSection;
