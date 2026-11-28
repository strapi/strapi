/**
 * `revoke-on-password-change`: changing a password signs every other session out.
 *
 * Better Auth's `/change-password` keeps the user's other sessions unless the caller sends
 * `revokeOtherSessions: true`, so a session someone else holds (a stolen cookie, a device left
 * signed in) survives the very action a user takes to lock it out. The request is made to carry it
 * whatever the caller sent, the same way `strapi-normalize` shapes the email: Better Auth reads the
 * body after every hook has run. The caller keeps a working session: Better Auth makes a new one for
 * them in the same request, and `second-factor` carries over whether the old one passed a second
 * factor.
 *
 * The compat shape of the route (`passwordConfirmation`, no `newPassword`) is answered by
 * `strapi-compat` before this hook, which runs the native endpoint itself with the same flag.
 */
import { createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

export const revokeOnPasswordChange = (): BetterAuthPlugin => ({
  id: 'revoke-on-password-change',
  hooks: {
    before: [
      {
        matcher: (context) => context.path === '/change-password',
        handler: createAuthMiddleware(async () => ({
          context: { body: { revokeOtherSessions: true } },
        })),
      },
    ],
  },
});
