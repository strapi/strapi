/**
 * `password-policy`: the admin's password rules on every request that sets a password.
 *
 * It fails closed. The before-hook runs on every path and checks each password-like body field that
 * is a string (`password`, `newPassword`) against `service('settings').get().passwords`, read on
 * every request, so a changed `minLength` applies on the next request with no rebuild and a path a
 * later plugin adds (`/email-otp/reset-password`, `/phone-number/reset-password`) is covered with no
 * list to keep. A problem is a 400 `PASSWORD_TOO_WEAK` with the message.
 *
 * The paths that only check a password the user already has are left alone, because refusing them
 * for a weak one would lock out people whose password predates the rules: the sign-in paths
 * (`/sign-in/*`), the two-factor paths that ask for the password again (`/two-factor/*`) and
 * `/delete-user`, and the compatibility sign-in `/local`. A body without a string password is left
 * to Better Auth's own validation.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import type settingsService from '../../../services/settings';
import { PASSWORD_TOO_WEAK, passwordProblem } from '../../password-policy';

/** The body fields that carry a password someone is setting. */
const PASSWORD_FIELDS = ['password', 'newPassword'];

/** Paths that verify the password the user already has instead of setting one. */
const EXISTING_PASSWORD_PREFIXES = ['/sign-in/', '/two-factor/'];
const EXISTING_PASSWORD_PATHS = new Set<string>(['/delete-user', '/local']);

const setsPassword = (path: string | undefined): boolean =>
  Boolean(path) &&
  !EXISTING_PASSWORD_PATHS.has(path as string) &&
  !EXISTING_PASSWORD_PREFIXES.some((prefix) => (path as string).startsWith(prefix));

export const passwordPolicy = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'password-policy',

  hooks: {
    before: [
      {
        matcher: (context) => setsPassword(context.path),
        handler: createAuthMiddleware(async (ctx) => {
          const body = ctx.body as Record<string, unknown> | null | undefined;
          const given = PASSWORD_FIELDS.map((field) => body?.[field]).filter(
            (value): value is string => typeof value === 'string'
          );

          if (given.length === 0) {
            return;
          }

          const { passwords } = await (
            strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>
          ).get();

          for (const password of given) {
            const problem = passwordProblem(password, passwords);

            if (problem) {
              throw new APIError('BAD_REQUEST', { code: PASSWORD_TOO_WEAK, message: problem });
            }
          }
        }),
      },
    ],
  },
});
