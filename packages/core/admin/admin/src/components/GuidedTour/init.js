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
      const [pluginName, completedStepName] = step.split('.');
      set(copyInitialState, ['guidedTourState', pluginName, completedStepName], true);
    });
  }

  if (currentStepLocaleStorage) {
    set(copyInitialState, 'currentStep', currentStepLocaleStorage);
  }

  return copyInitialState;
};

export default init;
