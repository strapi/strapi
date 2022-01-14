export const setStateToLocaleStorage = (section, step) => {
  const localeStorageState = JSON.parse(localStorage.getItem('GUIDED_TOUR_COMPLETED_STEPS')) || [];
  localeStorageState.push(`${section}.${step}`);
  localStorage.setItem('GUIDED_TOUR_COMPLETED_STEPS', JSON.stringify(localeStorageState));
};
