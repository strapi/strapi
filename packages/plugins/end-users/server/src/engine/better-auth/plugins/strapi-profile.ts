/**
 * `strapi-profile`: what a sign-up may write to the profile.
 *
 * A project puts its own data on `plugin::end-users.profile` (the user type is locked), and a
 * sign-up form wants to send some of it with the email and the password (`company`, `newsletter`).
 * Which of it is up to an administrator: the *registration fields* list (`service('settings')`).
 * Every other key of a sign-up body that Better Auth does not read itself is refused, with a 400
 * that names it: `"<field> is not allowed at sign-up"`. So is a user field Better Auth keeps out of
 * client input (`input: false`: `banned`, `twoFactorEnabled`, `role`, `emailVerified`), which Better
 * Auth alone would quietly replace with its default. Nothing is written to a profile that the
 * list did not name, and a field that is listed is still only written when the profile can take it
 * from a sign-up (a plain, writable, non-private attribute: never a relation, never `user`).
 *
 * This is a before-hook, and it is the whole of the plugin. The values it lets through are checked
 * against the profile's own rules (type, length, unique, required) before anything is created, so a
 * bad value is a 400 and not a user without its data. They are then left on the request, for the
 * `create-profile` Document Service middleware to write with the profile it makes: Better Auth runs
 * the whole sign-up in one database transaction, so the profile and its data are written with the
 * user, or not at all. An after-hook could not do that (it runs once the transaction is committed),
 * and a profile with a required field could never be created empty first.
 *
 * The keys are not removed from the body. Better Auth reads only the user fields it has declared
 * (`db/schema.mjs`, `parseInputData`) and ignores the rest, and a before-hook cannot take a key out
 * of a body anyway: what it returns is merged over what the plugins before it returned, so `email`
 * as `strapi-normalize` trimmed it would come back as the request sent it.
 *
 * It is the last of the plugin's own Better Auth plugins, after `strapi-normalize`.
 */
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID } from '../../../constants';
import { hasRequestState, setPendingProfile } from '../../../utils/pending-profile';
import type settingsService from '../../../services/settings';

const SIGN_UP_PATH = '/sign-up/email';

/** What the sign-up endpoint reads from the body besides the user fields. */
const SIGN_UP_KEYS = ['name', 'email', 'password', 'image', 'callbackURL', 'rememberMe'];

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const signUpDisabled = () =>
  new APIError('FORBIDDEN', {
    message: 'Sign-up is disabled',
    code: 'SIGN_UP_DISABLED',
  });

const notAllowed = (key: string) =>
  new APIError('BAD_REQUEST', {
    message: `${key} is not allowed at sign-up`,
    code: 'FIELD_NOT_ALLOWED_AT_SIGN_UP',
  });

export const strapiProfile = (strapi: Core.Strapi): BetterAuthPlugin => {
  const settings = () =>
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>;

  const assertSignUpEnabled = async () => {
    if (!(await settings().get()).signUp.enabled) {
      throw signUpDisabled();
    }
  };

  return {
    id: 'strapi-profile',
    // Every way a user is created asks the same question, read per request: the email sign-up (the
    // before-hook, which answers before any profile field is looked at) and any other, an OAuth
    // callback, a magic link, an email OTP, through the database hook. Better Auth passes an API
    // error from a hook through (the OAuth callback does not turn it into a redirect), so a new user
    // through a provider is a 403 with the same code. A user who already exists signs in: no user is
    // created, so nothing asks.
    init: () => ({
      options: {
        databaseHooks: {
          user: {
            create: {
              async before() {
                await assertSignUpEnabled();
              },
            },
          },
        },
      },
    }),
    hooks: {
      before: [
        {
          matcher: (context) => context.path === SIGN_UP_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            await assertSignUpEnabled();

            const { body } = ctx as { body?: unknown };

            if (!isPlain(body)) {
              return;
            }

            // A user field Better Auth declares with `input: false` (`banned`, `twoFactorEnabled`,
            // `role`, `emailVerified`...) is not the sign-up's to set, and it is refused here, whatever
            // the value. Better Auth itself would not refuse it: `parseInputData` replaces an
            // `input: false` field that has a default with the default, and the sign-up goes on as if
            // the key had not been sent (`db/schema.mjs`). A 400 that names it tells the client.
            const userFields = (ctx.context.tables?.user?.fields ?? {}) as Record<
              string,
              { input?: boolean } | undefined
            >;

            for (const key of Object.keys(body)) {
              if (userFields[key]?.input === false) {
                throw notAllowed(key);
              }
            }

            // What Better Auth reads itself: the sign-up keys and the user fields its plugins declare
            // (the `input: false` ones are already refused above). Any other key is a profile field.
            const readByBetterAuth = new Set([...SIGN_UP_KEYS, ...Object.keys(userFields)]);
            const keys = Object.keys(body).filter((key) => !readByBetterAuth.has(key));

            if (keys.length === 0) {
              return;
            }

            const allowed = new Set(await settings().getSignUpFields());

            for (const key of keys) {
              if (!allowed.has(key)) {
                throw notAllowed(key);
              }
            }

            const fields = Object.fromEntries(keys.map((key) => [key, body[key]]));

            try {
              await strapi.entityValidator.validateEntityCreation(
                strapi.contentType(PROFILE_UID) as never,
                fields as never
              );
            } catch (error) {
              if (error instanceof errors.ValidationError) {
                throw new APIError('BAD_REQUEST', {
                  message: error.message,
                  code: 'INVALID_PROFILE_FIELD',
                });
              }

              throw error;
            }

            // The values go with the user create, which happens in this request. A sign-up that is not
            // in one has nowhere to leave them, and must not drop what the user sent without a word.
            if (!hasRequestState(strapi)) {
              throw new APIError('INTERNAL_SERVER_ERROR', {
                message: 'Profile fields at sign-up need an HTTP request',
                code: 'NO_REQUEST_FOR_PROFILE_FIELDS',
              });
            }

            setPendingProfile(strapi, { fields });
          }),
        },
      ],
    },
  };
};
