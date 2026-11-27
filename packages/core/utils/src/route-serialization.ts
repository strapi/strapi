/*
 * Utility to sanitize content API route objects for safe JSON serialization.
 * Removes Zod validation fields (request/response) for safe serialization.
 *
 * NOTE: some content API routes are returned to the admin panel e.g. to
 * populate the users and permissions roles page. We need to ensure that the
 * routes can be serialized to JSON without errors.
 */

export const sanitizeRouteForSerialization = ({
  request: _request,
  response: _response,
  ...rest
}: Record<string, unknown>) => rest as Record<string, unknown>;

export const sanitizeRoutesArrayForSerialization = (routes: unknown[]): Record<string, unknown>[] =>
  routes
    .filter((route): route is Record<string, unknown> => !!route && typeof route === 'object')
    .map(sanitizeRouteForSerialization);

/** A route without its Zod schemas (`request` and `response`), as it is serialized. */
export type SerializableRoute<TRoute> = Omit<TRoute, 'request' | 'response'>;

/**
 * Removes `request` and `response` from each route of each array of `map`, and keeps other values.
 * A map of route objects keeps its route type.
 */
export function sanitizeRoutesMapForSerialization<TRoute extends object>(
  map: Record<string, TRoute[]>
): Record<string, SerializableRoute<TRoute>[]>;
export function sanitizeRoutesMapForSerialization(
  map: Record<string, unknown[]>
): Record<string, unknown>;
export function sanitizeRoutesMapForSerialization(
  map: Record<string, unknown[]>
): Record<string, unknown> {
  return Object.entries(map).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: Array.isArray(value) ? sanitizeRoutesArrayForSerialization(value) : value,
    }),
    {}
  );
}
