/**
 * Locale stored on the row we compare before syncing non-localized fields.
 * `*` means every locale, so it must not be used as a column filter.
 */
const localeForOriginalLookup = (locale: unknown): string | undefined => {
  if (typeof locale !== 'string' || locale === '*') {
    return undefined;
  }

  return locale;
};

export { localeForOriginalLookup };
