/**
 * `last-sign-in`: `user.lastSignInAt` is set whenever a session is created, by any way of signing in
 * (password, a provider, a magic link, the plugin's own `createSession`). It is a database hook, so
 * it runs for every session Better Auth creates, with no endpoint to name.
 *
 * It is a plugin (and not an option of the base) so it adds to a project's own `databaseHooks`
 * instead of being replaced by them. The write goes through the adapter, not the internal adapter
 * (which is made after plugins are initialized), so it runs no user hooks of its own.
 *
 * A failed write is logged and never fails the sign-in: the date is information, not a gate.
 */
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';

export const lastSignIn = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'last-sign-in',

  init: (context) => ({
    options: {
      databaseHooks: {
        session: {
          create: {
            async after(session: { userId: string }) {
              try {
                await context.adapter.update({
                  model: 'user',
                  where: [{ field: 'id', value: session.userId }],
                  update: { lastSignInAt: new Date() },
                });
              } catch (error) {
                strapi.log.warn(
                  `${PLUGIN_ID}: could not set lastSignInAt of user ${session.userId} ` +
                    `(${(error as Error)?.message ?? String(error)}).`
                );
              }
            },
          },
        },
      },
    },
  }),
});
