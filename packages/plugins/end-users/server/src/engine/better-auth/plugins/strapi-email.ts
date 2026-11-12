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

import { readCompatConfig } from '../../../compat/config';
import { PLUGIN_ID } from '../../../constants';
import { templateKey } from '../../../emails/templates';
import type { EmailTemplateName } from '../../../emails/templates';
import { maskEmail } from '../../../utils/mask-email';
import type settingsService from '../../../services/settings';
import type { TransactionHooks } from '../../../utils/transaction-hooks';
import { resolveBasePath } from '../base-path';
import { resolveServerOrigin } from '../server-origin';
import { isPlain } from '../../../utils/is-plain';

interface EmailUser {
  name?: string | null;
  email: string;
  preferredLocale?: unknown;
}

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

/** The name of the application, in the emails that give it: the setting, else the package name. */
const appNameOf = (strapi: Core.Strapi): string => {
  const configured = strapi.config.get<unknown>(`plugin::${PLUGIN_ID}.appName`);
  const packageName = strapi.config.get<unknown>('info.name');
  const name = [configured, packageName].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== ''
  );

  return name?.trim() ?? 'Strapi';
};

/**
 * Tells the old address that the email has changed. The new one is masked (`j***@example.com`) and
 * there is no link in it: it only says to contact the project if the change was not the user's.
 */
export const sendEmailChangedNotice = (
  strapi: Core.Strapi,
  {
    oldEmail,
    newEmail,
    preferredLocale,
  }: { oldEmail: string; newEmail: string; preferredLocale?: unknown }
): Promise<void> =>
  send(
    strapi,
    'email-changed',
    oldEmail,
    {
      appName: appNameOf(strapi),
      newEmailMasked: maskEmail(newEmail),
      changedAt: `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    },
    localeOf({ preferredLocale })
  );

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

/**
 * The links of the compatibility mode, which a users-permissions front end reads: the reset link is
 * the reset page with `?code=`, and the verification link is the compat route with
 * `?confirmation=`. Native links are the ones Better Auth built.
 */
const compatResetUrl = async (strapi: Core.Strapi, token: string): Promise<string> => {
  const { redirects } = await settings(strapi).get();
  const origin = resolveServerOrigin(strapi.config);
  const page = redirects.passwordReset || `${resolveBasePath(strapi.config)}/reset-password`;
  // A reset page given as a path is on this server
  const base = /^[a-z][a-z0-9+.-]*:/i.test(page) ? page : `${origin}${page}`;

  return `${base}${base.includes('?') ? '&' : '?'}code=${encodeURIComponent(token)}`;
};

const compatConfirmationUrl = (strapi: Core.Strapi, token: string): string =>
  `${resolveServerOrigin(strapi.config)}${resolveBasePath(strapi.config)}/email-confirmation` +
  `?confirmation=${encodeURIComponent(token)}`;

const compatOn = (strapi: Core.Strapi): boolean => readCompatConfig(strapi).usersPermissions;

const welcome = async (strapi: Core.Strapi, user: EmailUser) => {
  try {
    await send(strapi, 'welcome', user.email, { user: person(user) }, localeOf(user));
  } catch (error) {
    // The account exists: a welcome that could not be sent must not fail the sign-up or the link
    strapi.log.warn(`${PLUGIN_ID}: could not send the welcome email: ${(error as Error)?.message}`);
  }
};

const sendReset = async (
  strapi: Core.Strapi,
  { user, url, token }: { user: EmailUser; url: string; token?: string }
) =>
  send(
    strapi,
    'reset-password',
    user.email,
    {
      user: person(user),
      url: compatOn(strapi) && token ? await compatResetUrl(strapi, token) : url,
    },
    localeOf(user)
  );

const sendVerification = async (
  strapi: Core.Strapi,
  { user, url, token }: { user: EmailUser; url: string; token: string }
) => {
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

  await send(
    strapi,
    'verify-email',
    user.email,
    { user: person(user), url: compatOn(strapi) ? compatConfirmationUrl(strapi, token) : url },
    localeOf(user)
  );
};

/**
 * Runs `work` once the request's database transaction has committed, and not at all when it rolls
 * back. Better Auth runs an endpoint in one transaction and, with a background-task handler set,
 * lets the email outlive it: left in the transaction's context, the send would read through a
 * transaction that is already over. The answer does not wait for it, so a failure has no request
 * left to answer and is logged.
 */
const afterCommit = (strapi: Core.Strapi, work: () => Promise<void>): Promise<void> => {
  const run = () => {
    work().catch((error: unknown) => {
      strapi.log.error(`${PLUGIN_ID}: an email could not be sent (${(error as Error)?.message}).`);
    });
  };

  // Without a database there is no transaction to wait for: it is sent, and awaited, at once
  if (typeof strapi.db?.transaction !== 'function') {
    return work();
  }

  return strapi.db.transaction(({ onCommit }: TransactionHooks) => {
    onCommit(run);
  });
};

/**
 * The senders of `emailVerification`, `emailAndPassword` and the welcome. `sendVerificationEmail`
 * also carries a change of address: Better Auth sends that confirmation through it, to the new
 * address, with a token that names it (`updateTo`).
 */
export const emailSenders = (strapi: Core.Strapi) => ({
  emailAndPassword: {
    sendResetPassword: (input: { user: EmailUser; url: string; token?: string }) =>
      afterCommit(strapi, () => sendReset(strapi, input)),
  },
  emailVerification: {
    sendVerificationEmail: (input: { user: EmailUser; url: string; token: string }) =>
      afterCommit(strapi, () => sendVerification(strapi, input)),

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
  return {
    issuer: appNameOf(strapi),
    otpOptions: {
      // Better Auth stores the emailed code in plain text by default. It is compared by hash, so a
      // database read does not hand out a code that signs someone in. Nothing reads it back: the
      // sender is given the plain code when it is made.
      storeOTP: 'hashed' as const,
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
