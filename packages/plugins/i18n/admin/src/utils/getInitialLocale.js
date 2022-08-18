import getLocaleFromQuery from './getLocaleFromQuery';

const getInitialLocale = (query, locales = []) => {
  const localeFromQuery = getLocaleFromQuery(query);

  if (localeFromQuery) {
    return locales.find((locale) => locale.code === localeFromQuery);
  }

  // Returns the default locale when nothing is in the query
  return locales.find((locale) => locale.isDefault);
};

export default getInitialLocale;
