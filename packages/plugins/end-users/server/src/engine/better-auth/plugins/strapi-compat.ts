/**
 * `strapi-compat`: the Users & Permissions routes under `/api/auth`, while the compatibility mode is
 * on. It is installed first, so a hook of its own runs before the other plugins' hooks, and only
 * when `compat.usersPermissions` is on: with it off the route table is the one without this plugin.
 *
 * A compat route never signs in, signs up or sets a password itself. Each one runs the engine's own
 * endpoint through `engine.callNative`, so lockout, the password policy, the email rules and the
 * rate limits apply to it as they do to the native one. What the route adds is the request and
 * response shape: `endpoints/*` decide the answer, and this file turns it into the HTTP answer.
 *
 * Its rate-limit rules are the compat paths' only: the native paths keep Better Auth's own.
 */
import { randomUUID } from 'node:crypto';
import { APIError, createAuthEndpoint, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import type { CompatConfig } from '../../../compat/config';
import { emailConfirmation, sendEmailConfirmation } from '../../../compat/endpoints/confirmation';
import { local } from '../../../compat/endpoints/local';
import {
  changePassword,
  forgotPassword,
  isCompatChange,
  isCompatReset,
  resetPassword,
} from '../../../compat/endpoints/passwords';
import { register } from '../../../compat/endpoints/register';
import { logout, refresh, revokeSession, sessions } from '../../../compat/endpoints/refresh';
import type { CompatResult } from '../../../compat/types';
import { pendingDevice } from '../../../compat/pending-device';
import { pendingUsername } from '../../../compat/pending-username';
import { RESET_PASSWORD_IDENTIFIER } from '../reset-identifier';

/** The compat paths, which share one window each. */
const SIGN_IN_PATHS = new Set<string>(['/local', '/local/register']);
const EMAIL_PATHS = new Set<string>(['/forgot-password', '/send-email-confirmation']);

const WINDOW_SECONDS = 60;

/** Turns what a compat endpoint decided into the answer: a refusal is thrown with its own body. */
const respond = (
  ctx: {
    json: (body: Record<string, unknown>) => unknown;
    redirect: (url: string) => unknown;
    responseHeaders: Headers;
  },
  result: CompatResult
) => {
  if (result.status === 302) {
    return ctx.redirect((result.body as { location: string }).location);
  }

  if (result.status >= 400) {
    throw new APIError(
      result.status as ConstructorParameters<typeof APIError>[0],
      result.body as never
    );
  }

  for (const cookie of result.cookies ?? []) {
    ctx.responseHeaders.append('set-cookie', cookie);
  }

  return ctx.json(result.body as Record<string, unknown>);
};

/** What ends a request from a hook: the body as the answer, a refusal thrown with its own body. */
const finish = (result: CompatResult): Record<string, unknown> => {
  if (result.status >= 400) {
    throw new APIError(
      result.status as ConstructorParameters<typeof APIError>[0],
      result.body as never
    );
  }

  return result.body as Record<string, unknown>;
};

export const strapiCompat = (strapi: Core.Strapi, cfg: CompatConfig): BetterAuthPlugin => ({
  id: 'strapi-compat',

  // The device a session belongs to, which the refresh routes use to sign out one device
  schema: {
    session: {
      fields: {
        deviceId: { type: 'string', required: false, input: false, index: true },
      },
    },
  },

  // A compat registration's username goes into the user's own create, so the user never exists
  // without it. Only the compat route enters the mark this reads (`pending-username`).
  init: () => ({
    options: {
      databaseHooks: {
        user: {
          create: {
            async before() {
              const username = pendingUsername();

              return username === undefined ? undefined : { data: { username } };
            },
          },
        },
        // Every session has a device: the one a compat sign-in named (`pending-device`), the one
        // the session was made for, or a new one
        session: {
          create: {
            async before(session: Record<string, unknown>) {
              if (typeof session.deviceId === 'string' && session.deviceId !== '') {
                return undefined;
              }

              return { data: { deviceId: pendingDevice() ?? randomUUID() } };
            },
          },
        },
      },
    },
  }),

  endpoints: {
    // POST /api/auth/local
    compatLocal: createAuthEndpoint('/local', { method: 'POST' }, async (ctx) =>
      respond(ctx, await local(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // POST /api/auth/local/register
    compatRegister: createAuthEndpoint('/local/register', { method: 'POST' }, async (ctx) =>
      respond(ctx, await register(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // POST /api/auth/refresh
    compatRefresh: createAuthEndpoint('/refresh', { method: 'POST' }, async (ctx) =>
      respond(ctx, await refresh(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // POST /api/auth/logout
    compatLogout: createAuthEndpoint('/logout', { method: 'POST' }, async (ctx) =>
      respond(ctx, await logout(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // GET /api/auth/sessions
    compatSessions: createAuthEndpoint('/sessions', { method: 'GET' }, async (ctx) =>
      respond(ctx, await sessions(strapi, cfg, { headers: ctx.headers }))
    ),

    // DELETE /api/auth/sessions/:sessionId
    compatRevokeSession: createAuthEndpoint(
      '/sessions/:sessionId',
      { method: 'DELETE' },
      async (ctx) =>
        respond(
          ctx,
          await revokeSession(strapi, cfg, {
            headers: ctx.headers,
            sessionId: ctx.params.sessionId,
          })
        )
    ),

    // POST /api/auth/forgot-password
    compatForgotPassword: createAuthEndpoint('/forgot-password', { method: 'POST' }, async (ctx) =>
      respond(ctx, await forgotPassword(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // GET /api/auth/email-confirmation
    compatEmailConfirmation: createAuthEndpoint(
      '/email-confirmation',
      { method: 'GET' },
      async (ctx) => respond(ctx, await emailConfirmation(strapi, cfg, { query: ctx.query }))
    ),

    // POST /api/auth/send-email-confirmation
    compatSendEmailConfirmation: createAuthEndpoint(
      '/send-email-confirmation',
      { method: 'POST' },
      async (ctx) => respond(ctx, await sendEmailConfirmation(strapi, cfg, { body: ctx.body }))
    ),
  },

  /**
   * `/reset-password` and `/change-password` are the native routes with a second body shape. A
   * request in the users-permissions shape is answered here, from the hook: Better Auth applies a
   * body a hook rewrites only after every hook has run, so lockout and the password policy would
   * never see it. The engine's own endpoint is run instead (`callNative`) with the native body, and
   * its answer, as `{ jwt, user }`, is what ends the request. That inner call passes through this
   * hook too, with a native body, and goes on.
   */
  hooks: {
    before: [
      {
        matcher: (context) => context.path === '/reset-password',
        handler: createAuthMiddleware(async (ctx) => {
          if (!isCompatReset(ctx.body)) {
            return undefined;
          }

          const result = await resetPassword(strapi, cfg, {
            body: ctx.body,
            headers: ctx.headers,
            async userOfCode(code) {
              const record = await ctx.context.internalAdapter.findVerificationValue(
                `${RESET_PASSWORD_IDENTIFIER}${code}`
              );

              return record?.value ?? null;
            },
          });

          return finish(result);
        }),
      },
      {
        matcher: (context) => context.path === '/change-password',
        handler: createAuthMiddleware(async (ctx) => {
          if (!isCompatChange(ctx.body)) {
            return undefined;
          }

          return finish(
            await changePassword(strapi, cfg, { body: ctx.body, headers: ctx.headers })
          );
        }),
      },
    ],
  },

  rateLimit: [
    {
      pathMatcher: (path: string) => SIGN_IN_PATHS.has(path),
      window: WINDOW_SECONDS,
      max: 5,
    },
    {
      pathMatcher: (path: string) => EMAIL_PATHS.has(path),
      window: WINDOW_SECONDS,
      max: 3,
    },
  ],
});
