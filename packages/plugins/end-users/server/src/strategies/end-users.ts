import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { PLUGIN_ID, USER_UID } from '../constants';
import type abilityService from '../services/ability';
import type roleService from '../services/role';
import type settingsService from '../services/settings';
import type { RoleSummary } from '../services/role';
import type { AuthEngine } from '../engine/types';
import { banState } from '../utils/ban';

export const STRATEGY_NAME = 'end-users';

/**
 * Route scopes `verify` lets any caller of this strategy through, Public and signed-in alike, with
 * no grant: what they answer is the caller's own. `GET /api/end-users/permissions/me` is one: a front
 * end asks it what to show before it knows what the caller may do. A list here, not a route with
 * `auth: { scope: [] }`, because core fills an empty scope list with the route's own action.
 */
export const ALWAYS_ALLOWED_SCOPES: readonly string[] = Object.freeze([
  'plugin::end-users.permissions.forCaller',
]);

/** What `ctx.state.user` is for a signed-in end user, and what `credentials` holds. */
export interface EndUserCredentials {
  /** The database id. Prefer `documentId`. */
  id: number;
  documentId: string;
  email: string;
  username: string | null;
  name: string;
  image: string | null;
  emailVerified: boolean;
  roles: Array<{ documentId: string; name: string; type: string }>;
}

type Plain = Record<string, unknown>;

interface Authentication {
  authenticated?: boolean;
  credentials?: unknown;
  ability?: unknown;
  error?: Error | null;
}

interface AuthenticationInfo {
  credentials: unknown;
  ability: unknown;
}

/** What `verify` asks of an ability: whether an action, a route's scope, is allowed. */
interface ScopeAbility {
  can(action: string): boolean;
}

/** Methods that do not change anything, so a request forged from another site gains nothing. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Every header of the request, as the engine reads them (the session cookie, a Bearer token). */
const toHeaders = (ctx: Context) => {
  const headers = new Headers();

  for (const [name, value] of Object.entries(ctx.request.headers)) {
    if (value === undefined) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }

  return headers;
};

/**
 * The Content API authentication strategy of end users.
 *
 * It answers, for every request that reaches a route with Content API auth and was not taken by an
 * API token first:
 *
 * - a valid session (the session cookie, or a Bearer session token): the user, with their roles
 * - no credentials at all: the Public role
 * - credentials that are not good (unknown, expired, revoked): 401, never the Public role
 * - a banned user: 403 with `details.code` `USER_BANNED`
 * - an unverified user, while the Sign-in settings require a verified email: 403
 *   `EMAIL_NOT_VERIFIED`
 * - a user holding a role that requires two-factor authentication, without it enabled: 403
 *   `TWO_FACTOR_REQUIRED`
 * - a request that writes with the session cookie, from an origin that is not trusted: 403
 *   `ORIGIN_NOT_TRUSTED`
 *
 * `verify` then asks the ability whether the route's scope is allowed.
 */
const createEndUsersStrategy = (strapi: Core.Strapi) => {
  const plugin = () => strapi.plugin(PLUGIN_ID);
  const engine = () => plugin().service('engine').get() as AuthEngine;
  const roles = () => plugin().service('role') as ReturnType<typeof roleService>;
  const abilities = () => plugin().service('ability') as ReturnType<typeof abilityService>;
  const settings = () => plugin().service('settings') as ReturnType<typeof settingsService>;

  const invalidCredentials = () => new errors.UnauthorizedError('Invalid credentials');

  /**
   * Cookies the engine wants the client to have: the fresh cookie of an extended session, or the
   * cookies that clear a stale one. A response that sets a session cookie is never kept by a
   * shared cache, which would hand it to the next client.
   */
  const sendCookies = (ctx: Context, cookies: string[]) => {
    if (cookies.length === 0) {
      return;
    }

    ctx.append('Set-Cookie', cookies);
    ctx.set('Cache-Control', 'private, no-store');
  };

  /**
   * A browser sends the session cookie with any request to this server, a form posted from another
   * site included (with `SameSite=None`, which `cookies.crossSite` sets, and Strapi parses form and
   * multipart bodies). So a request that may change something, made with the cookie, has to come
   * from a trusted origin or the server's own: the rule the engine applies to its own endpoints,
   * with the engine's matcher. The `Origin` header, or the `Referer` when there is none; neither,
   * or `null`, is refused, as the engine refuses them. A Bearer request is not checked: no browser
   * adds the header by itself, so another site cannot forge one.
   *
   * The refusal is a `PolicyError`, not a bare `ForbiddenError`: on a GET, core's `authorize`
   * middleware (the public-files route runs first and wraps the route) turns any other
   * `ForbiddenError` into a bare `ctx.forbidden()`, and the message and the code are lost. Only a
   * `PolicyError` is shown publicly on a 403. It is still a 403.
   */
  const assertTrustedOrigin = async (ctx: Context) => {
    if (SAFE_METHODS.has(ctx.method.toUpperCase())) {
      return;
    }

    // The headers as sent (`ctx.get('referer')` would prefer a `Referrer` header, which no browser
    // sends and the engine does not read)
    const { origin: originHeader, referer } = ctx.request.headers;
    const origin = originHeader || referer || '';

    if (origin === '' || origin === 'null') {
      throw new errors.PolicyError('Missing or null Origin', { code: 'ORIGIN_NOT_TRUSTED' });
    }

    if (!(await engine().isTrustedOrigin(origin))) {
      throw new errors.PolicyError('Origin not trusted', { code: 'ORIGIN_NOT_TRUSTED' });
    }
  };

  /** The signed-in user: the row, and the roles they hold. */
  const toCredentials = (user: Plain, held: RoleSummary[]): EndUserCredentials => ({
    id: user.id as number,
    documentId: user.documentId as string,
    email: user.email as string,
    username: (user.username as string | null | undefined) ?? null,
    name: user.name as string,
    image: (user.image as string | null | undefined) ?? null,
    emailVerified: Boolean(user.emailVerified),
    roles: held.map(({ documentId, name, type }) => ({ documentId, name, type })),
  });

  const authenticate = async (ctx: Context): Promise<Authentication> => {
    // An error here (the database is down) is an error, not a request with no credentials: it
    // propagates and answers 500, and the request is never given the Public role because of it.
    const { session, credentials, source, setCookies } = await engine().lookupSession(
      toHeaders(ctx)
    );

    if (!session) {
      if (credentials) {
        // A stale session cookie is cleared: kept, it would get the client a 401 on every request
        // until it ran out
        if (source === 'cookie') {
          sendCookies(ctx, setCookies);
        }

        return { authenticated: false, error: invalidCredentials() };
      }

      return {
        authenticated: true,
        credentials: null,
        ability: await abilities().forUser(null, []),
      };
    }

    if (source === 'cookie') {
      await assertTrustedOrigin(ctx);
    }

    const user = (await strapi.db
      .query(USER_UID)
      .findOne({ where: { documentId: session.userId } })) as Plain | null;

    // A session whose user is gone is not a session
    if (!user) {
      return { authenticated: false, error: invalidCredentials() };
    }

    // Checked here, on every request, because a ban takes effect on the next one. The error is
    // thrown, not returned: a returned error is always a 401, and carries no code. It is a
    // `PolicyError` so that its message and code survive core's `authorize` on a GET (see
    // `assertTrustedOrigin`).
    if (banState(user) === 'active') {
      throw new errors.PolicyError('You have been banned from this application.', {
        code: 'USER_BANNED',
      });
    }

    // Read from the settings cache on every request, so a user who verifies their email is let in
    // by the next request and turning the setting on or off applies at once. The Content API
    // refuses the unverified; the auth endpoints, where they sign in and verify, never reach this
    // strategy.
    if (user.emailVerified !== true && (await settings().get()).signUp.requireEmailVerification) {
      throw new errors.PolicyError('Verify your email address to use this application.', {
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const held = await roles().getForUser(user.documentId as string);

    // A role can require a second factor. Until the user has enabled one, the Content API refuses
    // them; the auth endpoints, where they enable it, never reach this strategy.
    if (held.some((role) => role.requireTwoFactor) && user.twoFactorEnabled !== true) {
      throw new errors.PolicyError('Two-factor authentication is required for your role.', {
        code: 'TWO_FACTOR_REQUIRED',
      });
    }

    const endUser = toCredentials(user, held);
    // The row, not the credentials: conditions read `$user.<attribute>`, and the credentials carry
    // seven of them. The ability service leaves out what is private.
    const ability = await abilities().forUser(user, held);

    ctx.state.user = endUser;

    // The engine sends a fresh cookie when it extends a session. A cookie client only keeps a
    // sliding lifetime if that cookie reaches it. A Bearer client has no use for one.
    if (source === 'cookie') {
      sendCookies(ctx, setCookies);
    }

    return { authenticated: true, credentials: endUser, ability };
  };

  /**
   * The same rule as users-permissions: the route's scope has to be allowed, and a route without a
   * scope needs a signed-in user. One fix: Public is a role like any other, so when it allows
   * nothing the answer is 403, as it is for any role that may not. users-permissions answers 401,
   * which is the answer for credentials that are missing or bad, and here none of them is.
   *
   * A scope in `ALWAYS_ALLOWED_SCOPES` needs no grant: the ability is not asked about it.
   */
  const verify = (auth: AuthenticationInfo, config?: { scope?: string | string[] } | false) => {
    const { credentials: user, ability } = auth;
    const scope = config ? config.scope : undefined;

    if (!scope) {
      // Without a scope there is nothing to allow: any signed-in user, nobody else
      if (!user) {
        throw new errors.UnauthorizedError();
      }

      return;
    }

    const scopes = Array.isArray(scope) ? scope : [scope];
    const needed = scopes.filter((each) => !ALWAYS_ALLOWED_SCOPES.includes(each));

    if (scopes.length > 0 && needed.length === 0) {
      return;
    }

    if (!ability) {
      throw new errors.UnauthorizedError();
    }

    if (!needed.every((each) => (ability as ScopeAbility).can(each))) {
      throw new errors.ForbiddenError();
    }
  };

  return { name: STRATEGY_NAME, authenticate, verify };
};

export default createEndUsersStrategy;
