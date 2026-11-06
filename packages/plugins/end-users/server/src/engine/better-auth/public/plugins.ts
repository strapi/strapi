/**
 * `@strapi/plugin-end-users/auth/plugins`: the Better Auth plugins a project may opt into from
 * `config/plugins.ts`.
 *
 * Projects import them from here, never from `better-auth` itself, so there is one copy of Better
 * Auth in the application and Strapi owns its upgrades. `bearer`, `username`, `twoFactor` and
 * `admin` are not listed: the plugin installs them for every project.
 */
import '../../../assert-node-version';

import {
  emailOTP as betterAuthEmailOTP,
  magicLink as betterAuthMagicLink,
} from 'better-auth/plugins';

import { sendEmailOtp, sendMagicLinkEmail } from '../plugins/strapi-email';

type MagicLinkOptions = Parameters<typeof betterAuthMagicLink>[0];
type EmailOtpOptions = Parameters<typeof betterAuthEmailOTP>[0];

/**
 * Sends the link through the `end-users.magic-link` email template. A `sendMagicLink` of the
 * project's own replaces it.
 */
export const magicLink = (
  options: Partial<MagicLinkOptions> = {}
): ReturnType<typeof betterAuthMagicLink> =>
  betterAuthMagicLink({ sendMagicLink: sendMagicLinkEmail, ...options });

/**
 * Sends the code through the `end-users.email-otp` email template. A `sendVerificationOTP` of the
 * project's own replaces it.
 */
export const emailOTP = (
  options: Partial<EmailOtpOptions> = {}
): ReturnType<typeof betterAuthEmailOTP> =>
  betterAuthEmailOTP({ sendVerificationOTP: sendEmailOtp, ...options });

export {
  phoneNumber,
  jwt,
  oneTap,
  anonymous,
  multiSession,
  oneTimeToken,
  openAPI,
  captcha,
  haveIBeenPwned,
  genericOAuth,
} from 'better-auth/plugins';
