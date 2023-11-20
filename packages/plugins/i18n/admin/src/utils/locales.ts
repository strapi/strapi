import { Locale, RootState } from '../store/reducers';

interface PotentialQueryWithLocale {
  plugins?: { i18n?: { locale?: string; [key: string]: unknown }; [key: string]: unknown };
}

/**
 * Returns the locale from the passed query.
 * If a default value is passed, it will return it if the locale does not exist.
 */
function getLocaleFromQuery(query: PotentialQueryWithLocale): string | undefined;
function getLocaleFromQuery(query: PotentialQueryWithLocale, defaultValue: string): string;
function getLocaleFromQuery(
  query: PotentialQueryWithLocale,
  defaultValue?: string
): string | undefined {
  const locale = query?.plugins?.i18n?.locale;

  if (!locale && defaultValue) {
    return defaultValue;
  }

  return locale;
}

/**
 * Returns the initial locale from the query falling back to the default locale
 * listed in the collection of locales provided.
 */
const getInitialLocale = (
  query: PotentialQueryWithLocale,
  locales: Locale[] = []
): Locale | undefined => {
  const localeFromQuery = getLocaleFromQuery(query);

  if (localeFromQuery) {
    return locales.find((locale) => locale.code === localeFromQuery);
  }

  // Returns the default locale when nothing is in the query
  return locales.find((locale) => locale.isDefault);
};

const getDefaultLocale = (
  ctPermissions: RootState['rbacProvider']['collectionTypesRelatedPermissions'][string],
  locales: Locale[] = []
) => {
  const defaultLocale = locales.find((locale) => locale.isDefault);

  if (!defaultLocale) {
    return null;
  }

  const readPermissions = ctPermissions['plugin::content-manager.explorer.read'] ?? [];
  const createPermissions = ctPermissions['plugin::content-manager.explorer.create'] ?? [];

  if (
    readPermissions.some(({ properties }) =>
      (properties?.locales ?? []).includes(defaultLocale.code)
    ) ||
    createPermissions.some(({ properties }) =>
      (properties?.locales ?? []).includes(defaultLocale.code)
    )
  ) {
    return defaultLocale.code;
  }

  // When the default locale is not authorized, we return the first authorized locale
  return (
    (readPermissions[0]?.properties?.locales?.[0] ||
      createPermissions[0]?.properties?.locales?.[0]) ??
    null
  );
};

export { getLocaleFromQuery, getInitialLocale, getDefaultLocale };
