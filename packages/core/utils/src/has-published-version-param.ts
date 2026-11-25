import { ValidationError } from './errors';
import type { PublicationFilterMode } from './publication-filter';

/**
 * Parses the deprecated `hasPublishedVersion` query param (REST boolean or "true"/"false" strings).
 * @deprecated Prefer `publicationFilter` with document-scoped modes.
 */
export const parseHasPublishedVersionQueryParam = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new ValidationError(
    "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
  );
};

/** Maps legacy boolean to the document-scoped `publicationFilter` cohorts (same semantics as the old subquery). */
export const hasPublishedVersionBooleanToPublicationFilterMode = (
  value: boolean
): Extract<PublicationFilterMode, 'never-published-document' | 'has-published-version-document'> =>
  value ? 'has-published-version-document' : 'never-published-document';
