/*
 * Utility to sanitize content API route objects for safe JSON serialization.
 * Removes Zod validation fields (request/response) for safe serialization.
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
): Record<string, Record<string, unknown>[]> =>
  Object.entries(map).reduce(
    (acc, [key, value]) => ({
      ...acc,
      ...(Array.isArray(value) && { [key]: sanitizeRoutesArrayForSerialization(value) }),
    }),
    {}
  );
