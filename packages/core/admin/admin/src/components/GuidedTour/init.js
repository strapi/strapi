import set from 'lodash/set';
import persistStateToLocaleStorage, {
  COMPLETED_STEPS,
  CURRENT_STEP,
} from './utils/persistStateToLocaleStorage';

const init = initialState => {
  const guidedTourLocaleStorage = persistStateToLocaleStorage.get(COMPLETED_STEPS);
  const currentStepLocaleStorage = persistStateToLocaleStorage.get(CURRENT_STEP);

  if (guidedTourLocaleStorage) {
    guidedTourLocaleStorage.forEach(step => {
      const [pluginName, completedStepName] = step.split('.');
      set(initialState, ['guidedTourState', pluginName, completedStepName], true);
    });
  }

  if (currentStepLocaleStorage) {
    set(initialState, 'currentStep', currentStepLocaleStorage);
  }

  return initialState;
};

export default init;
