/**
 * Pending releases allowed when a license grants no usable `maximumReleases`: a license with the
 * content-releases feature always grants at least this many (see #19208).
 */
export const DEFAULT_MAXIMUM_RELEASES = 3;

/**
 * Reads the pending-releases cap from a license's `maximumReleases` option. A missing, zero,
 * negative or non-numeric value means the default, so the server and the admin agree on it.
 */
export const getMaximumReleases = (value: unknown): number => {
  const limit = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof limit === 'number' && Number.isFinite(limit) === true && limit > 0) {
    return limit;
  }

  return DEFAULT_MAXIMUM_RELEASES;
};
