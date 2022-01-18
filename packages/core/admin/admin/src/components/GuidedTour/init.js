import set from 'lodash/set';

const init = initialState => {
  const guidedTourLocaleStorage = JSON.parse(localStorage.getItem('GUIDED_TOUR_COMPLETED_STEPS'));
  const currentStepLocaleStorage = JSON.parse(localStorage.getItem('GUIDED_TOUR_CURRENT_STEP'));

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
