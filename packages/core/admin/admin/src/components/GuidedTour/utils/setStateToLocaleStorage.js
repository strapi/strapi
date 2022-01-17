const setStateToLocaleStorage = currentStep => {
  const localeStorageState = JSON.parse(localStorage.getItem('GUIDED_TOUR_COMPLETED_STEPS')) || [];
  const isAlreadyStored = localeStorageState.includes(currentStep);

  if (isAlreadyStored) {
    return;
  }

  localeStorageState.push(currentStep);
  localStorage.setItem('GUIDED_TOUR_COMPLETED_STEPS', JSON.stringify(localeStorageState));
};

export default setStateToLocaleStorage;
