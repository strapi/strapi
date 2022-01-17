const setCurrentStepToLocaleStorage = step => {
  localStorage.setItem('GUIDED_TOUR_CURRENT_STEP', step);
};

export default setCurrentStepToLocaleStorage;
