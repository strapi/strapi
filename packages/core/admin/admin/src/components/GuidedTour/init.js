import set from 'lodash/set';
import persistStateToLocaleStorage, {
  COMPLETED_STEPS,
  CURRENT_STEP,
} from './utils/persistStateToLocaleStorage';

const init = initialState => {
  const copyInitialState = { ...initialState };
  const guidedTourLocaleStorage = persistStateToLocaleStorage.get(COMPLETED_STEPS);
  const currentStepLocaleStorage = persistStateToLocaleStorage.get(CURRENT_STEP);

  if (guidedTourLocaleStorage) {
    guidedTourLocaleStorage.forEach(step => {
      const [sectionName, stepName] = step.split('.');
      set(copyInitialState, ['guidedTourState', sectionName, stepName], true);
    });
  }

  // if current step when initializing mark it as done
  if (currentStepLocaleStorage) {
    const [sectionName, stepName] = currentStepLocaleStorage.split('.');
    set(copyInitialState, ['guidedTourState', sectionName, stepName], true);
    persistStateToLocaleStorage.addCompletedStep(currentStepLocaleStorage);
    persistStateToLocaleStorage.addCurrentStep(null);
  }

  return copyInitialState;
};

export default init;
