const setCurrentStepToLocaleStorage = step => {
  localStorage.setItem('GUIDED_TOUR_CURRENT_STEP', JSON.stringify(step));
};

export default setCurrentStepToLocaleStorage;
