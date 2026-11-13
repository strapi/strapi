import { upError } from './errors';

/** The compat paths that are not Better Auth's own, which share the envelope of their errors. */
const COMPAT_ONLY_PATHS: ReadonlySet<string> = new Set([
  '/local',
  '/local/register',
  '/refresh',
  '/logout',
  '/sessions',
  '/forgot-password',
  '/email-confirmation',
  '/send-email-confirmation',
]);

const isCompatOnlyPath = (path: string): boolean =>
  COMPAT_ONLY_PATHS.has(path) || path.startsWith('/sessions/') || /^\/[^/]+\/callback$/.test(path);

const FALLBACK_MESSAGE = 'Too many requests. Please try again later.';

/**
 * Better Auth answers a request over its rate limit before any endpoint runs, with `{ message }`.
 * On a compat path that is the Strapi envelope with a `RateLimitError`, as Users & Permissions
 * answered, and the headers (`X-Retry-After`) stay. Any other answer, and any other path, is
 * returned as it came.
 */
export const compatRateLimitResponse = async (
  response: Response,
  pathname: string,
  basePath: string
): Promise<Response> => {
  const relative = pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : null;

  if (response.status !== 429 || relative === null || !isCompatOnlyPath(relative)) {
    return response;
  }

  const given = (await response
    .clone()
    .json()
    .catch(() => null)) as { message?: unknown } | null;
  const message = typeof given?.message === 'string' ? given.message : FALLBACK_MESSAGE;
  const headers = new Headers(response.headers);

  headers.set('content-type', 'application/json');
  headers.delete('content-length');

  return new Response(JSON.stringify(upError('RateLimitError', message)), {
    status: 429,
    statusText: response.statusText,
    headers,
  });
};
