/**
 * `legacy-revoke`: a password change, or a revoke of the other sessions or of all of them, signs the
 * user out of the old Users & Permissions tokens too, which Better Auth's own revoke does not reach.
 *
 * It is installed whether or not the compatibility mode is on. The moment of the revoke is written
 * on the user (`legacyTokensRevokedAt`) either way, so a user who signed out everywhere before the
 * mode was on does not get their old tokens back when it is turned on later, while
 * `legacyJwt.until` is still in the future. The part that ends the old sessions held by core's
 * session manager does nothing without the old origin.
 *
 * The compat shape of a password change runs the native route through the engine, so it passes
 * through this hook as well.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { revokeLegacySessions } from '../../../compat/legacy-sessions';

/** The native routes that end sessions of the caller's user other than, or including, the one in use */
export const SESSION_REVOKING_PATHS = new Set<string>([
  '/change-password',
  '/revoke-sessions',
  '/revoke-other-sessions',
]);

export const legacyRevoke = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'legacy-revoke',
  hooks: {
    after: [
      {
        matcher: (context) => SESSION_REVOKING_PATHS.has(context.path as string),
        handler: createAuthMiddleware(async (ctx) => {
          const userId = ctx.context.session?.user.id;

          if (userId && !(ctx.context.returned instanceof APIError)) {
            await revokeLegacySessions(strapi, userId);
          }
        }),
      },
    ],
  },
});
