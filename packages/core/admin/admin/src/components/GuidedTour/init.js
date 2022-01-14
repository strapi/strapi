import set from 'lodash/set';

const init = initialState => {
  const guidedTourLocaleStorage = JSON.parse(localStorage.getItem('GUIDED_TOUR_COMPLETED_STEPS'));

  if (guidedTourLocaleStorage) {
    guidedTourLocaleStorage.forEach(step => {
      const [pluginName, completedStepName] = step.split('.');
      set(initialState, ['guidedTourState', pluginName, completedStepName], true);
    });
  }

  return initialState;
};

export default init;
