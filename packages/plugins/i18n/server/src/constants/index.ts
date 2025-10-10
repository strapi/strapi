import isoLocales from './iso-locales.json';

/**
 * Returns the default locale based either on env var or english
 * @returns {string}
 */
const getInitLocale = () => {
  const envLocaleCode = process.env.STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE;

  if (envLocaleCode) {
    const matchingLocale = isoLocales.find(({ code }) => code === envLocaleCode);

    if (!matchingLocale) {
      throw new Error(
        'Unknown locale code provided in the environment variable STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE'
      );
    }

    return { ...matchingLocale };
  }

  return {
    code: 'en',
    name: 'English (en)',
  };
};

const DEFAULT_LOCALE = getInitLocale();

export { isoLocales, DEFAULT_LOCALE, getInitLocale };
