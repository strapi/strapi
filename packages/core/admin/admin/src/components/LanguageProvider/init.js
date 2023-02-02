import localStorageKey from './utils/localStorageKey';

const init = (localeNames) => {
  const languageFromLocaleStorage = window.localStorage.getItem(localStorageKey);
  const appLanguage = localeNames[languageFromLocaleStorage] ? languageFromLocaleStorage : 'en';

  return {
    locale: appLanguage,
    localeNames,
  };
};

export default init;
