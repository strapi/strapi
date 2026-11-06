/**
 * `strapi-email`: every email the engine sends goes through the email plugin's templates
 * (`end-users.<name>`, see `emails/templates.ts`), so an administrator can edit them.
 *
 * What is here:
 *  - the senders Better Auth calls (`emailSenders`: verify, reset, change email, and the welcome
 *    after verification), the one-time-code senders of the two-factor plugin (`twoFactorOptions`),
 *    and the magic-link and email-OTP senders the public plugin wrappers default to;
 *  - the Better Auth plugin, which fills a redirect the caller left out from the settings
 *    (`redirects`) and sends the welcome at sign-up.
 *
 * A sender the project sets in `config/plugins.ts` (`auth`) wins: the senders are the base options,
 * and the project's are merged over them.
 *
 * Each template is picked by the user's `preferredLocale`, then `en`, then the registered defaults. A
 * magic link and an email OTP only know the address, so they have no locale.
 */
import { createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import { templateKey } from '../../../emails/templates';
import type { EmailTemplateName } from '../../../emails/templates';
import type settingsService from '../../../services/settings';

interface EmailUser {
  name?: string | null;
  email: string;
  preferredLocale?: unknown;
}

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What the email plugin accepts as a locale (`en`, `pt-BR`); anything else is left to `en`. */
const LOCALE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

const localeOf = (user?: { preferredLocale?: unknown }): string | undefined => {
  const locale = user?.preferredLocale;

  return typeof locale === 'string' && locale.length <= 16 && LOCALE.test(locale)
    ? locale
    : undefined;
};

const send = (
  strapi: Core.Strapi,
  name: EmailTemplateName,
  to: string,
  data: Record<string, unknown>,
  locale?: string
): Promise<void> =>
  strapi.plugin('email').service('templates').sendTemplate(templateKey(name), to, data, { locale });

const person = (user: EmailUser) => ({ name: user.name ?? '', email: user.email });

const settings = (strapi: Core.Strapi) =>
  strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>;

/**
 * What a verification token (a JWT Better Auth made and signed a moment ago) says: the address it
 * is for and, for a change of address, the new one. Only used to pick a template and fill it in:
 * nothing here is trusted, Better Auth verifies the token when the link is followed.
 */
const tokenPayload = (token: unknown): { email?: string; updateTo?: string } => {
  try {
    const part = typeof token === 'string' ? token.split('.')[1] : undefined;
    const payload: unknown = JSON.parse(Buffer.from(part ?? '', 'base64url').toString('utf8'));

    if (!isPlain(payload)) {
      return {};
    }

    return {
      email: typeof payload.email === 'string' ? payload.email : undefined,
      updateTo: typeof payload.updateTo === 'string' ? payload.updateTo : undefined,
    };
  } catch {
    return {};
  }
};

const welcome = async (strapi: Core.Strapi, user: EmailUser) => {
  try {
    await send(strapi, 'welcome', user.email, { user: person(user) }, localeOf(user));
  } catch (error) {
    // The account exists: a welcome that could not be sent must not fail the sign-up or the link
    strapi.log.warn(`${PLUGIN_ID}: could not send the welcome email: ${(error as Error)?.message}`);
  }
};

/**
 * The senders of `emailVerification`, `emailAndPassword` and the welcome. `sendVerificationEmail`
 * also carries a change of address: Better Auth sends that confirmation through it, to the new
 * address, with a token that names it (`updateTo`).
 */
export const emailSenders = (strapi: Core.Strapi) => ({
  emailAndPassword: {
    sendResetPassword: async ({ user, url }: { user: EmailUser; url: string }) =>
      send(strapi, 'reset-password', user.email, { user: person(user), url }, localeOf(user)),
  },
  emailVerification: {
    async sendVerificationEmail({
      user,
      url,
      token,
    }: {
      user: EmailUser;
      url: string;
      token: string;
    }) {
      const { email: current, updateTo } = tokenPayload(token);

      if (updateTo) {
        // `user.email` is already the new address here; the one being replaced is in the token
        await send(
          strapi,
          'change-email',
          updateTo,
          { user: person({ ...user, email: current ?? user.email }), newEmail: updateTo, url },
          localeOf(user)
        );

        return;
      }

      await send(strapi, 'verify-email', user.email, { user: person(user), url }, localeOf(user));
    },

    /**
     * Once, when the address is verified. Better Auth runs this for a changed address too, which is
     * not a new user, and a project that does not require verification has had its welcome at
     * sign-up already.
     */
    async afterEmailVerification(user: EmailUser, request?: Request) {
      if (tokenPayload(request ? new URL(request.url).searchParams.get('token') : null).updateTo) {
        return;
      }

      if (!(await settings(strapi).get()).signUp.requireEmailVerification) {
        return;
      }

      await welcome(strapi, user);
    },
  },
});

/** The two-factor plugin: the name an authenticator app shows, and the code sent by email. */
export const twoFactorOptions = (strapi: Core.Strapi) => {
  const configured = strapi.config.get<unknown>(`plugin::${PLUGIN_ID}.appName`);
  const packageName = strapi.config.get<unknown>('info.name');
  const issuer = [configured, packageName].find(
    (name): name is string => typeof name === 'string' && name.trim() !== ''
  );

  return {
    issuer: issuer?.trim() ?? 'Strapi',
    otpOptions: {
      sendOTP: async ({ user, otp }: { user: EmailUser; otp: string }) =>
        send(
          strapi,
          'two-factor-otp',
          user.email,
          { user: { name: user.name ?? '' }, otp },
          localeOf(user)
        ),
    },
  };
};

/**
 * The magic-link and email-OTP senders. The public `magicLink()` and `emailOTP()` default to them;
 * they find Strapi when they run, because a project builds those plugins in `config/plugins.ts`,
 * before Strapi exists.
 */
export const sendMagicLinkEmail = async ({ email, url }: { email: string; url: string }) =>
  send(globalThis.strapi, 'magic-link', email, { email, url });

export const sendEmailOtp = async ({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: string;
}) => send(globalThis.strapi, 'email-otp', email, { email, otp, type });

/**
 * Where a request that names no redirect gets one from: the endpoint, its field and the setting.
 * An OAuth sign-in or link (a generic provider is served by the same two endpoints as a social one)
 * takes the error redirect: Better Auth keeps it in the state of the flow and sends the browser
 * there when the callback fails, in place of its own error page on the Strapi host.
 */
const REDIRECTS: Record<
  string,
  {
    field: 'redirectTo' | 'callbackURL' | 'errorCallbackURL';
    setting: 'passwordReset' | 'emailVerified' | 'error';
  }
> = {
  '/sign-in/social': { field: 'errorCallbackURL', setting: 'error' },
  '/link-social': { field: 'errorCallbackURL', setting: 'error' },
  '/request-password-reset': { field: 'redirectTo', setting: 'passwordReset' },
  '/send-verification-email': { field: 'callbackURL', setting: 'emailVerified' },
  '/sign-up/email': { field: 'callbackURL', setting: 'emailVerified' },
  '/change-email': { field: 'callbackURL', setting: 'emailVerified' },
};

export const strapiEmail = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'strapi-email',

  init: () => ({
    options: {
      databaseHooks: {
        user: {
          create: {
            // At sign-up, when there will be no verification to wait for (and for an address a
            // provider has already verified)
            async after(user: EmailUser & { emailVerified?: boolean }) {
              if (
                user.emailVerified ||
                !(await settings(strapi).get()).signUp.requireEmailVerification
              ) {
                await welcome(strapi, user);
              }
            },
          },
        },
      },
    },
  }),

  hooks: {
    before: [
      {
        matcher: (context) => Boolean(context.path && REDIRECTS[context.path]),
        handler: createAuthMiddleware(async (ctx) => {
          const { body } = ctx as { body?: unknown };
          const { field, setting } = REDIRECTS[ctx.path as string];

          if (!isPlain(body) || (typeof body[field] === 'string' && body[field] !== '')) {
            return;
          }

          const redirect = (await settings(strapi).get()).redirects[setting];

          // Only the key that is added: what an earlier plugin changed in the body is kept
          return redirect ? { context: { body: { [field]: redirect } } } : undefined;
        }),
      },
    ],
  },
});
