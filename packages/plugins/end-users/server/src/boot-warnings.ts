import type { Core } from '@strapi/types';

import { MIN_SECRET_LENGTH, PLUGIN_ID } from './constants';
import { hasWildcard, originsFromEnv, TRUSTED_ORIGINS_ENV } from './config/trusted-origins';

/**
 * Settings that work, but make a deployment weaker than its owner probably thinks. They are logged
 * at boot and never thrown: the application starts, and the operator is told.
 */

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const CORS = 'strapi::cors';

/**
 * The middlewares Strapi runs when the project has no `config/middlewares`: its built-in list,
 * where `strapi::cors` is a bare name, so its own defaults apply (see `defaultConfig` in
 * `register-middlewares.ts` of `@strapi/core`). Only the entry that matters here is listed.
 */
const BUILT_IN_MIDDLEWARES = [CORS];

/**
 * What the `strapi::cors` middleware is configured with, or `undefined` when it is not in the list.
 * Its own defaults apply to what the entry leaves out: any origin, with credentials.
 */
const corsConfig = (strapi: Core.Strapi): Plain | undefined => {
  const configured = strapi.config.get('middlewares');
  // A project that does not configure the list gets Strapi's: no configuration is not "no CORS"
  const middlewares = configured === undefined ? BUILT_IN_MIDDLEWARES : configured;

  if (!Array.isArray(middlewares)) {
    return undefined;
  }

  for (const entry of middlewares) {
    if (entry === CORS) {
      return {};
    }

    if (isPlain(entry) && entry.name === CORS) {
      return isPlain(entry.config) ? entry.config : {};
    }
  }

  return undefined;
};

/** Whether the middleware answers every origin: `*` on its own, in a list, or in a comma list. */
const allowsEveryOrigin = (config: Plain) => {
  // The middleware spreads its config over its defaults, so a key that is there wins, even as undefined
  const origin = 'origin' in config ? config.origin : '*';

  // A function decides per request; there is nothing to say about it here
  if (typeof origin === 'function') {
    return false;
  }

  if (origin === undefined || origin === null) {
    return true;
  }

  const origins = Array.isArray(origin) ? origin : String(origin).split(',');

  return origins.some((value) => String(value).trim() === '*');
};

const sendsCredentials = (config: Plain) =>
  'credentials' in config ? Boolean(config.credentials) : true;

/**
 * Cookies that a front end on another site can use (`SameSite=None`), next to CORS that lets any
 * origin read the answer with those cookies, make every website a place where a signed-in user's
 * session can be used.
 */
export const warnAboutCrossSiteCookies = (strapi: Core.Strapi): void => {
  if (strapi.config.get(`plugin::${PLUGIN_ID}.cookies.crossSite`) !== true) {
    return;
  }

  const config = corsConfig(strapi);

  if (config && allowsEveryOrigin(config) && sendsCredentials(config)) {
    strapi.log.warn(
      `${PLUGIN_ID}: cookies.crossSite is on, and the ${CORS} middleware allows every origin with ` +
        'credentials (origin: "*"). Any website could then use the session cookie of a signed-in ' +
        'user and read what the API answers. List your front-end origins as `origin` for ' +
        `${CORS} in config/middlewares.js.`
    );
  }
};

const warnAboutPatterns = (strapi: Core.Strapi, source: string, origins: unknown[]) => {
  const patterns = origins.filter(
    (origin): origin is string => typeof origin === 'string' && hasWildcard(origin)
  );

  if (patterns.length === 0) {
    return;
  }

  strapi.log.warn(
    `${PLUGIN_ID}: ${source} has wildcard patterns (${patterns.join(', ')}). Every origin ` +
      'that matches one is trusted with the session cookie and as a redirect target, so a host ' +
      'under it that someone else controls (an abandoned subdomain, a page that serves user ' +
      'content) could act as a signed-in user. List exact origins where you can.'
  );
};

/**
 * `trustedOrigins` entries, in the configuration and in the `BETTER_AUTH_TRUSTED_ORIGINS`
 * environment variable Better Auth adds to them, with a wildcard (`*` or `?`). They are allowed,
 * as long as they name a host (the validator refuses the ones that do not), but every origin that
 * matches one is trusted with the session: when one of those hosts can be taken over, or serves
 * other people's pages, it can act as a signed-in user.
 *
 * Reads what it can and says nothing about the rest: whether the value is well formed is the
 * validator's to say.
 */
export const warnAboutWildcardOrigins = (
  strapi: Core.Strapi,
  envVars: Record<string, string | undefined> = process.env
): void => {
  const trustedOrigins = strapi.config.get(`plugin::${PLUGIN_ID}.trustedOrigins`);

  if (Array.isArray(trustedOrigins)) {
    warnAboutPatterns(strapi, 'trustedOrigins', trustedOrigins);
  }

  warnAboutPatterns(
    strapi,
    `the ${TRUSTED_ORIGINS_ENV} environment variable`,
    originsFromEnv(envVars)
  );
};

/**
 * With a proxy trusted and no count of proxies, Koa takes the leftmost `X-Forwarded-For` entry for
 * the client address, which is the one the client wrote. The rate limits are per address.
 */
export const warnAboutProxy = (strapi: Core.Strapi): void => {
  if (!strapi.config.get('server.proxy.koa') || strapi.config.get('server.proxy.maxIpsCount')) {
    return;
  }

  strapi.log.warn(
    `${PLUGIN_ID}: server.proxy.koa is on and server.proxy.maxIpsCount is 0 or not set, so the ` +
      'client can choose the IP address that the rate limits see: it only has to send an ' +
      'X-Forwarded-For header. Set `proxy.maxIpsCount` in config/server.js to the number of ' +
      'proxies in front of Strapi.'
  );
};

/**
 * A secret shorter than 32 characters, in every environment. It signs the sessions and encrypts
 * what the plugin stores, and a short one is within reach of a guess. It is allowed, and said at
 * boot. A missing secret is not this warning's: production refuses to start without one.
 */
export const warnAboutShortSecret = (strapi: Core.Strapi): void => {
  const secret = strapi.config.get(`plugin::${PLUGIN_ID}.secret`);

  if (typeof secret !== 'string' || secret === '' || secret.length >= MIN_SECRET_LENGTH) {
    return;
  }

  strapi.log.warn(
    `${PLUGIN_ID}: the secret (END_USERS_SECRET) is shorter than ${MIN_SECRET_LENGTH} ` +
      'characters. It signs the sessions, so use a long random string: ' +
      '`openssl rand -base64 32` makes one.'
  );
};

/** The uids of a project's own content types: what a project can rename the actions of */
const PROJECT_UID_PREFIX = 'api::';

/**
 * Content types where a Content API route's own action has the id of a synthetic one
 * (`<uid>.publish`, `<uid>.read-drafts` of a draft & publish type), say a project's `publish`
 * controller action on its articles. A permission is stored by action, so one stored row for that
 * id opens the route and gives the data rule both: a role granted the route may publish, or read
 * drafts, and one granted publishing may call the route. It is allowed, and said once,
 * at bootstrap, when core has registered both kinds of action. Only the project's own types
 * (`api::`) are listed: the warning tells the project to rename a controller action, and it can't
 * rename a plugin's.
 */
export const warnAboutSyntheticActionClashes = (strapi: Core.Strapi): void => {
  const { action, syntheticAction } = strapi.contentAPI.permissions.providers;
  const clashes = new Map<string, string[]>();

  for (const id of syntheticAction.keys()) {
    if (action.has(id) && id.startsWith(PROJECT_UID_PREFIX)) {
      const end = id.lastIndexOf('.');
      const uid = id.slice(0, end);

      clashes.set(
        uid,
        [...(clashes.get(uid) ?? []), id.slice(end + 1)].sort((a, b) =>
          a < b ? -1 : a > b ? 1 : 0
        )
      );
    }
  }

  if (clashes.size === 0) {
    return;
  }

  const listed = [...clashes]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([uid, names]) => `${uid} (${names.join(', ')})`)
    .join(', ');

  strapi.log.warn(
    `${PLUGIN_ID}: a Content API route of these content types has the action of reading drafts ` +
      `or publishing: ${listed}. Permissions are stored by action, so one stored permission ` +
      'grants both the route and the data rule: a role given the route may also publish or read ' +
      'drafts, and the other way round. Rename the controller action to keep them apart.'
  );
};

export const logBootWarnings = (
  strapi: Core.Strapi,
  envVars: Record<string, string | undefined> = process.env
): void => {
  warnAboutShortSecret(strapi);
  warnAboutCrossSiteCookies(strapi);
  warnAboutWildcardOrigins(strapi, envVars);
  warnAboutProxy(strapi);
  warnAboutSyntheticActionClashes(strapi);
};
