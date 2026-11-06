/**
 * The path Better Auth is served under, and the one the catch-all route is mounted on: the REST
 * prefix of the application (`/api` unless the project set `api.rest.prefix`) and `/auth`.
 *
 * Both must agree: the route decides which requests reach the engine, and Better Auth's router
 * answers 404 to a path that does not start with its own base path. The prefix `''` gives `/auth`.
 */
interface ConfigLike {
  get(path: string): unknown;
}

const DEFAULT_REST_PREFIX = '/api';

export const resolveBasePath = (config: ConfigLike): string => {
  const configured = config.get('api.rest.prefix');
  const prefix = (typeof configured === 'string' ? configured : DEFAULT_REST_PREFIX)
    .trim()
    .replace(/\/+$/, '');

  if (prefix === '') {
    return '/auth';
  }

  return `${prefix.startsWith('/') ? prefix : `/${prefix}`}/auth`;
};
