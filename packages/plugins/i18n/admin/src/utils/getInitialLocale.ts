import getLocaleFromQuery from './getLocaleFromQuery';

const getInitialLocale = (query: any, locales: any = []) => {
  const localeFromQuery = getLocaleFromQuery(query);

  if (localeFromQuery) {
    return locales.find((locale: any) => locale.code === localeFromQuery);
  }

  // Returns the default locale when nothing is in the query
  return locales.find((locale: any) => locale.isDefault);
};

export default getInitialLocale;
