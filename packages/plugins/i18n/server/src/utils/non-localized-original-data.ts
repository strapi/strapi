type OriginalNonLocalizedLookupInput = {
  documentId?: string;
  locale?: unknown;
  action: string;
  hasDraftAndPublish: boolean;
  // The locales service reads the default from the core store, which is untyped.
  defaultLocale?: unknown;
};

type OriginalNonLocalizedLookup = {
  documentId: string;
  locale?: string;
  publishedAt?: { $ne: null } | { $null: true };
};

type SiblingNonLocalizedLookup = Omit<OriginalNonLocalizedLookup, 'locale'> & {
  locale: string | { $ne: string };
};

/** `'*'` means every locale, so it cannot scope the lookup to a single row. */
const asLocaleCode = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' && value !== '*' ? value : undefined;

/**
 * Lookup for the row we are about to write, so shared-field sync compares the
 * same locale and publication status instead of an arbitrary document row.
 */
const getOriginalNonLocalizedLookup = ({
  documentId,
  locale,
  action,
  hasDraftAndPublish,
  defaultLocale,
}: OriginalNonLocalizedLookupInput): OriginalNonLocalizedLookup | null => {
  if (!documentId) {
    return null;
  }

  const resolvedLocale = asLocaleCode(locale) ?? asLocaleCode(defaultLocale);

  const where: OriginalNonLocalizedLookup = { documentId };

  if (resolvedLocale) {
    where.locale = resolvedLocale;
  }

  if (hasDraftAndPublish) {
    where.publishedAt = action === 'publish' ? { $ne: null } : { $null: true };
  }

  return where;
};

/**
 * Rows to compare when the row being written does not exist yet, in the order
 * the document service copies non-localized values into a new locale: the
 * default locale first, then any other locale in the same status.
 *
 * A wildcard or multi-locale request writes several rows, so it has no single
 * new row to compare and keeps the original lookup only.
 */
const getSiblingNonLocalizedLookups = ({
  original,
  locale,
  defaultLocale,
}: {
  original: OriginalNonLocalizedLookup | null;
  locale?: unknown;
  defaultLocale?: unknown;
}): SiblingNonLocalizedLookup[] => {
  // The document service writes the default locale when `locale` is falsy.
  const isSingleLocale = !locale || (typeof locale === 'string' && locale !== '*');

  if (!original?.locale || !isSingleLocale) {
    return [];
  }

  const lookups: SiblingNonLocalizedLookup[] = [];
  const defaultCode = asLocaleCode(defaultLocale);

  if (defaultCode && defaultCode !== original.locale) {
    lookups.push({ ...original, locale: defaultCode });
  }

  lookups.push({ ...original, locale: { $ne: original.locale } });

  return lookups;
};

export { getOriginalNonLocalizedLookup, getSiblingNonLocalizedLookups };
export type { OriginalNonLocalizedLookupInput, OriginalNonLocalizedLookup };
