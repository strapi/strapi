import { LOCALE_LOCALSTORAGE_KEY } from '../../constants';

const init = (localeNames) => {
  const languageFromLocaleStorage = window.localStorage.getItem(LOCALE_LOCALSTORAGE_KEY);
  const appLanguage = localeNames[languageFromLocaleStorage] ? languageFromLocaleStorage : 'en';

  return {
    locale: appLanguage,
    localeNames,
  };
};

export default init;
