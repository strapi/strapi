import getLocaleFromQuery from './getLocaleFromQuery';

const getInitialLocale = (query, locales = []) => {
  const localeFromQuery = getLocaleFromQuery(query);

  if (localeFromQuery) {
    return locales.find(locale => locale.code === localeFromQuery);
  }

  return locales[0];
};

export default getInitialLocale;
