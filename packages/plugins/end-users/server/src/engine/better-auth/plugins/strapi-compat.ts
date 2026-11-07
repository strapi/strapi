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
import { APIError, createAuthEndpoint } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import type { CompatConfig } from '../../../compat/config';
import { local } from '../../../compat/endpoints/local';
import { register } from '../../../compat/endpoints/register';
import type { CompatResult } from '../../../compat/endpoints/result';

/** The compat paths, which share one window each. */
const SIGN_IN_PATHS = new Set<string>(['/local', '/local/register']);
const EMAIL_PATHS = new Set<string>(['/forgot-password', '/send-email-confirmation']);

const WINDOW_SECONDS = 60;

/** Turns what a compat endpoint decided into the answer: a refusal is thrown with its own body. */
const respond = (
  ctx: { json: (body: Record<string, unknown>) => unknown },
  result: CompatResult
) => {
  if (result.status >= 400) {
    throw new APIError(
      result.status as ConstructorParameters<typeof APIError>[0],
      result.body as never
    );
  }

  return ctx.json(result.body as Record<string, unknown>);
};

export const strapiCompat = (strapi: Core.Strapi, cfg: CompatConfig): BetterAuthPlugin => ({
  id: 'strapi-compat',

  endpoints: {
    // POST /api/auth/local
    compatLocal: createAuthEndpoint('/local', { method: 'POST' }, async (ctx) =>
      respond(ctx, await local(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),

    // POST /api/auth/local/register
    compatRegister: createAuthEndpoint('/local/register', { method: 'POST' }, async (ctx) =>
      respond(ctx, await register(strapi, cfg, { body: ctx.body, headers: ctx.headers }))
    ),
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
