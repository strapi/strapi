type OriginalNonLocalizedLookupInput = {
  documentId?: string;
  locale?: unknown;
  action: string;
  hasDraftAndPublish: boolean;
  defaultLocale: string;
};

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

  const resolvedLocale = typeof locale === 'string' && locale !== '*' ? locale : defaultLocale;

  if (!hasDraftAndPublish) {
    return {
      documentId,
      locale: resolvedLocale,
    };
  }

  if (action === 'publish') {
    return {
      documentId,
      locale: resolvedLocale,
      publishedAt: { $ne: null },
    };
  }

  return {
    documentId,
    locale: resolvedLocale,
    publishedAt: { $null: true },
  };
};

export { getOriginalNonLocalizedLookup };
export type { OriginalNonLocalizedLookupInput };
