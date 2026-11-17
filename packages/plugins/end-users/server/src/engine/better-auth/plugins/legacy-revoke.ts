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
 *
 * A change of email address ends every other session of the user as well, native and old alike:
 * the address is what a password reset is sent to, so a session that was open before it moved
 * cannot be trusted after. The session the verification link made or found (the one that sees the
 * new address) is kept.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { revokeLegacySessions } from '../../../compat/legacy-sessions';
import { tokenPayload } from './strapi-email';

/** The native routes that end sessions of the caller's user other than, or including, the one in use */
export const SESSION_REVOKING_PATHS = new Set<string>([
  '/change-password',
  '/revoke-sessions',
  '/revoke-other-sessions',
]);

const VERIFY_EMAIL_PATH = '/verify-email';

interface CreatedSession {
  session: { token: string };
  user: { id: string };
}

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
      {
        matcher: (context) => context.path === VERIFY_EMAIL_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          // Only the last step of a change of address puts the new one in place, and it is the only
          // step that leaves a session behind (made, or the caller's own, refreshed): the first
          // step only sends the mail to the new address, and a plain verification names no `updateTo`
          const kept = ctx.context.newSession as CreatedSession | null | undefined;

          if (!kept || !tokenPayload(ctx.query?.token).updateTo) {
            return;
          }

          const others = (await ctx.context.internalAdapter.listSessions(kept.user.id))
            .map((session) => session.token)
            .filter((token) => token !== kept.session.token);

          if (others.length > 0) {
            await ctx.context.internalAdapter.deleteSessions(others);
          }

          await revokeLegacySessions(strapi, kept.user.id);
        }),
      },
    ],
  },
});
