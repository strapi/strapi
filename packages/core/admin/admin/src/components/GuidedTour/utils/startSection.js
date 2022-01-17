import get from 'lodash/get';
import arePreviousSectionsDone from './arePreviousSectionsDone';

const startSection = (sectionName, guidedTourState, currentStep, setCurrentStep) => {
  const isSectionToShow = arePreviousSectionsDone(sectionName, guidedTourState);
  const isFirstStepDone = get(guidedTourState, `${sectionName}['create']`);

  if (isSectionToShow && !currentStep && !isFirstStepDone) {
    return setCurrentStep('contentTypeBuilder.create');
  }

  return null;
};

export default startSection;
