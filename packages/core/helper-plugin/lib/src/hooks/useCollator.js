/**
 * Borrowed from @react-aria/i18n
 */

/**
 * A cache of collators for the current locale.
 * @type {Map<string, Intl.Collator>}
 */
let cache = new Map();

/**
 * Provides localized string collation for the current locale. Automatically updates when the locale changes,
 * and handles caching of the collator for performance.
 *
 * @type {(locale: string, options?: Intl.CollatorOptions) => Intl.Collator}
 */
export function useCollator(locale, options) {
  let cacheKey =
    locale +
    (options
      ? Object.entries(options)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .join()
      : '');

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let formatter = new Intl.Collator(locale, options);
  cache.set(cacheKey, formatter);

  return formatter;
}
