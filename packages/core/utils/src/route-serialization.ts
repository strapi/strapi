/*
 * Utility to sanitize content API route objects for safe JSON serialization.
 * Removes Zod validation fields (request/response) for safe serialization.
 *
 * NOTE: some content API routes are returned to the admin panel e.g. to
 * populate the users and permissions roles page. We need to ensure that the
 * routes can be serialized to JSON without errors.
 */

export const sanitizeRouteForSerialization = ({
  request,
  response,
  ...rest
}: Record<string, unknown>) => rest as Record<string, unknown>;

export const sanitizeRoutesArrayForSerialization = (routes: unknown[]): Record<string, unknown>[] =>
  routes
    .filter((route): route is Record<string, unknown> => !!route && typeof route === 'object')
    .map(sanitizeRouteForSerialization);

export const sanitizeRoutesMapForSerialization = (
  map: Record<string, unknown[]>
): Record<string, unknown> =>
  Object.entries(map).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: Array.isArray(value) ? sanitizeRoutesArrayForSerialization(value) : value,
    }),
    {}
  );
