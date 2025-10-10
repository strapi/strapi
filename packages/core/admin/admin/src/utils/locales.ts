import * as locales from 'date-fns/locale';

type LocaleName = keyof typeof locales;

/**
 * Returns a valid date-fns locale name from a Strapi Admin locale.
 * Defaults to 'enUS' if the locale is not found.
 */
const getDateFnsLocaleName = (locale: string): LocaleName => {
  if (Object.keys(locales).includes(locale)) {
    return locale as LocaleName;
  }

  return 'enUS';
};

export { getDateFnsLocaleName };
