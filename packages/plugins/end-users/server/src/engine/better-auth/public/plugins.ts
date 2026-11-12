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
  phoneNumber as betterAuthPhoneNumber,
} from 'better-auth/plugins';

import { withoutBannedOtpRecipients, withoutBannedPhoneRecipients } from '../plugins/banned-reset';
import { sendEmailOtp, sendMagicLinkEmail } from '../plugins/strapi-email';

type MagicLinkOptions = Parameters<typeof betterAuthMagicLink>[0];
type EmailOtpOptions = Parameters<typeof betterAuthEmailOTP>[0];
type PhoneNumberOptions = Parameters<typeof betterAuthPhoneNumber>[0];

/**
 * Sends the link through the `end-users.magic-link` email template. A `sendMagicLink` of the
 * project's own replaces it.
 *
 * The token is stored hashed, whatever `storeToken` says: the stored value is what a link would be
 * looked up by, so a database read must not hand out a link that signs someone in. The sender is
 * given the plain token and link when they are made, and nothing reads the stored one back.
 */
export const magicLink = (
  options: Partial<MagicLinkOptions> = {}
): ReturnType<typeof betterAuthMagicLink> =>
  betterAuthMagicLink({ sendMagicLink: sendMagicLinkEmail, ...options, storeToken: 'hashed' });

/**
 * Sends the code through the `end-users.email-otp` email template. A `sendVerificationOTP` of the
 * project's own replaces it. Either one sends no password reset code to a banned user.
 *
 * The code is stored hashed, whatever `storeOTP` says, for the reason the magic link's token is.
 */
export const emailOTP = (
  options: Partial<EmailOtpOptions> = {}
): ReturnType<typeof betterAuthEmailOTP> => {
  const send = (options.sendVerificationOTP ?? sendEmailOtp) as Parameters<
    typeof withoutBannedOtpRecipients
  >[0];

  return betterAuthEmailOTP({
    ...options,
    storeOTP: 'hashed',
    sendVerificationOTP: withoutBannedOtpRecipients(send) as EmailOtpOptions['sendVerificationOTP'],
  });
};

/**
 * Better Auth's `phoneNumber`, whose `sendPasswordResetOTP` sends nothing to a banned user. Sending
 * the code is the project's: the plugin has no default sender.
 */
export const phoneNumber = (
  options?: PhoneNumberOptions
): ReturnType<typeof betterAuthPhoneNumber> => {
  const send = options?.sendPasswordResetOTP as
    Parameters<typeof withoutBannedPhoneRecipients>[0] | undefined;

  return betterAuthPhoneNumber(
    send
      ? ({
          ...options,
          sendPasswordResetOTP: withoutBannedPhoneRecipients(send),
        } as PhoneNumberOptions)
      : options
  );
};

export {
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
