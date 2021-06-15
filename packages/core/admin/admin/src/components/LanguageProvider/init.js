const localStorageKey = 'strapi-admin-language';

const init = localesNativeNames => {
  const languageFromLocaleStorage = window.localStorage.getItem(localStorageKey);
  const appLanguage = localesNativeNames[languageFromLocaleStorage]
    ? languageFromLocaleStorage
    : 'en';

  return {
    locale: appLanguage,
    localesNativeNames,
  };
};

export default init;
