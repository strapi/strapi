type OriginalNonLocalizedLookupInput = {
  documentId?: string;
  locale?: unknown;
  action: string;
  hasDraftAndPublish: boolean;
  // The locales service reads the default from the core store, which is untyped.
  defaultLocale?: unknown;
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
}: OriginalNonLocalizedLookupInput) => {
  if (!documentId) {
    return null;
  }

  const resolvedLocale = asLocaleCode(locale) ?? asLocaleCode(defaultLocale);

  const where: {
    documentId: string;
    locale?: string;
    publishedAt?: { $ne: null } | { $null: true };
  } = { documentId };

  if (resolvedLocale) {
    where.locale = resolvedLocale;
  }

  if (hasDraftAndPublish) {
    where.publishedAt = action === 'publish' ? { $ne: null } : { $null: true };
  }

  return where;
};

export { getOriginalNonLocalizedLookup };
export type { OriginalNonLocalizedLookupInput };
