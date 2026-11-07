import type { Core } from '@strapi/types';
import type { ExplainEntry } from '@strapi/utils';

import { PLUGIN_ID } from '../constants';
import { readCompatConfig } from '../compat/config';
import { isEndUsersStrategy } from '../strategies/end-users';

/** The response header that says what the permission checks did to a request */
export const EXPLAIN_HEADER = 'x-strapi-permissions-explain';

/** What the header carries at most; a header larger than this is refused by proxies and clients */
export const MAX_HEADER_BYTES = 8 * 1024;

/** What an explained request carries: the entries, then a marker when some were left out */
type Explained = ExplainEntry | { truncated: true; omitted: number };

/**
 * JSON that is safe as a header value: every character outside printable ASCII is escaped, so a
 * field named in another script can't make Node refuse the header, and a byte is a character.
 */
const asciiJson = (value: Explained) =>
  JSON.stringify(value).replace(
    /[^\x20-\x7e]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

/**
 * The entries as a JSON array that fits the header: the entries that fit, in order, then
 * `{ "truncated": true, "omitted": n }` for the rest.
 */
export const toHeaderValue = (entries: ExplainEntry[], max = MAX_HEADER_BYTES): string => {
  const serialized = entries.map(asciiJson);
  const whole = `[${serialized.join(',')}]`;

  if (whole.length <= max) {
    return whole;
  }

  // Room for the marker with the largest count it can carry, and the brackets and commas
  const marker = (omitted: number) => asciiJson({ truncated: true, omitted });
  const budget = max - marker(entries.length).length - 2;
  const kept: string[] = [];
  let size = 0;

  for (const item of serialized) {
    if (size + item.length + 1 > budget) {
      break;
    }

    kept.push(item);
    size += item.length + 1;
  }

  return `[${[...kept, marker(entries.length - kept.length)].join(',')}]`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

interface RouteState {
  info?: { type?: string };
  handler?: unknown;
  method?: string;
  path?: string;
  config?: { auth?: unknown };
}

/**
 * The route a request ran, as the scope its route-level permission checked
 * (`plugin::end-users.permissions.forCaller`), else its handler, else its method and path
 */
const routeOf = (route: RouteState) => {
  const { auth } = route.config ?? {};
  const scope =
    typeof auth === 'object' && auth !== null ? (auth as { scope?: unknown }).scope : [];
  const named = Array.isArray(scope) ? scope.find((each) => typeof each === 'string') : undefined;

  if (typeof named === 'string') {
    return named;
  }

  return typeof route.handler === 'string' ? route.handler : `${route.method} ${route.path}`;
};

/**
 * Explain mode for the Content API: what the permission engine did to a request of an
 * end user, so a developer can see why a field is missing or an entry is not listed.
 *
 * It runs once the response is built, on Content API routes, for requests the end-users strategy
 * authenticated: never for an API token, whose permissions the engine does not touch. With
 * `autoReload` on (development) or `explain: true` in the plugin's config, the answer carries the
 * `x-strapi-permissions-explain` header, cut at 8 KB, and `meta.permissions` with `?explain=true`.
 * Otherwise nothing is added to the response and the same entries go to the debug log.
 *
 * The entries name the caller's own roles and the conditions of their rows, never a parameter. A
 * request that ran no check (a custom route that skipped them) is `route-only`: it got the route's
 * permission and nothing else.
 *
 * It never changes what a request does: a failure here is logged and the response goes out as it was.
 */
export const createExplainMiddleware =
  (strapi: Core.Strapi): Core.MiddlewareHandler =>
  async (ctx, next) => {
    await next();

    try {
      const { route, auth } = ctx.state as {
        route?: RouteState;
        auth?: { strategy?: { name?: unknown } };
      };

      if (
        route?.info?.type !== 'content-api' ||
        !isEndUsersStrategy(auth?.strategy?.name, readCompatConfig(strapi).usersPermissions)
      ) {
        return;
      }

      const { checked, entries: recorded } = strapi.contentAPI.permissions.readExplain(auth);
      let entries = recorded;

      // A refusal is not a route that ran unchecked: the route's own permission said no
      if (!checked && ctx.status < 400) {
        entries = [{ kind: 'route-only', route: routeOf(route) }];
      }

      const explaining =
        Boolean(strapi.config.get('autoReload')) ||
        Boolean(strapi.config.get(`plugin::${PLUGIN_ID}.explain`));

      if (!explaining) {
        if (entries.length > 0) {
          strapi.log.debug(
            `Permissions explain for ${ctx.method} ${ctx.path}: ${JSON.stringify(entries)}`
          );
        }

        return;
      }

      ctx.set(EXPLAIN_HEADER, toHeaderValue(entries));

      const { body } = ctx;

      // A body that is not a plain object (a list, a stream, a buffer) has no place for it
      if (ctx.query.explain === 'true' && isPlainObject(body)) {
        const meta = isPlainObject(body.meta) ? body.meta : {};

        body.meta = { ...meta, permissions: entries };
      }
    } catch (error) {
      strapi.log.debug(
        `Permissions explain failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

export default createExplainMiddleware;
