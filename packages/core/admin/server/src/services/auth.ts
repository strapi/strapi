import bcrypt from 'bcryptjs';
import _ from 'lodash';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { expiresInToSeconds } from './token';
import type { AdminUser } from '../../../shared/contracts/shared';
import '@strapi/types';

const { ApplicationError } = errors;

// Default lifetime of an admin reset-password token. Overridable via
// `admin.forgotPassword.expiresIn` (number of seconds or a shorthand like '15m', '1h').
const DEFAULT_RESET_PASSWORD_TOKEN_EXPIRES_IN = '1h';

/**
 * Resolve the reset-password token lifetime, in milliseconds, from config.
 * Falls back to {@link DEFAULT_RESET_PASSWORD_TOKEN_EXPIRES_IN} for unset/invalid values.
 */
const getResetPasswordTokenTTL = (): number => {
  const configured = strapi.config.get(
    'admin.forgotPassword.expiresIn',
    DEFAULT_RESET_PASSWORD_TOKEN_EXPIRES_IN
  );
  const seconds =
    expiresInToSeconds(configured) ??
    (expiresInToSeconds(DEFAULT_RESET_PASSWORD_TOKEN_EXPIRES_IN) as number);
  return seconds * 1000;
};

/**
 * Create a reset-password token with an expiry and persist it on the user.
 * Shared by the CE and EE auth services so the expiry behaviour can't drift.
 * @returns the generated reset-password token
 */
const assignResetPasswordToken = async (userId: AdminUser['id']): Promise<string> => {
  const resetPasswordToken = getService('token').createToken();
  const resetPasswordTokenExpiresAt = new Date(Date.now() + getResetPasswordTokenTTL());

  await getService('user').updateById(userId, {
    resetPasswordToken,
    resetPasswordTokenExpiresAt,
  });

  return resetPasswordToken;
};

/**
 * Reject a reset-password token that has expired — or that has no expiry at all
 * (tokens issued before this was introduced) — clearing the stale token so it
 * cannot be retried. Shared by the CE and EE auth services. (GH#25711)
 */
const assertResetPasswordTokenIsValid = async (user: AdminUser): Promise<void> => {
  const { resetPasswordTokenExpiresAt } = user;
  const isExpired =
    !resetPasswordTokenExpiresAt || new Date(resetPasswordTokenExpiresAt).getTime() <= Date.now();

  if (isExpired) {
    // Clear the stale token so it can no longer be retried.
    await getService('user').updateById(user.id, {
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
    });
    throw new ApplicationError('This reset password token has expired');
  }
};

/**
 * hashes a password
 * @param password - password to hash
 * @returns hashed password
 */
const hashPassword = (password: string) => bcrypt.hash(password, 10);

/**
 * Validate a password
 * @param password
 * @param hash
 * @returns {Promise<boolean>} is the password valid
 */
const validatePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/**
 * Check login credentials
 * @param email the users email address
 * @param password the users password
 */
const checkCredentials = async ({ email, password }: { email: string; password: string }) => {
  const user: AdminUser = await strapi.db.query('admin::user').findOne({ where: { email } });

  if (!user || !user.password) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  const isValid = await validatePassword(password, user.password);

  if (!isValid) {
    return [null, false, { message: 'Invalid credentials' }];
  }

  if (!(user.isActive === true)) {
    return [null, false, { message: 'User not active' }];
  }

  return [null, user];
};

/**
 * Send an email to the user if it exists or do nothing
 * @param email user email for which to reset the password
 */
const forgotPassword = async ({ email } = {} as { email: string }) => {
  const user: AdminUser = await strapi.db
    .query('admin::user')
    .findOne({ where: { email, isActive: true } });
  if (!user) {
    return;
  }

  const resetPasswordToken = await assignResetPasswordToken(user.id);

  // Send an email to the admin.
  const url = `${strapi.config.get(
    'admin.absoluteUrl'
  )}/auth/reset-password?code=${resetPasswordToken}`;

  return strapi
    .plugin('email')
    .service('email')
    .sendTemplatedEmail(
      {
        to: user.email,
        from: strapi.config.get('admin.forgotPassword.from'),
        replyTo: strapi.config.get('admin.forgotPassword.replyTo'),
      },
      strapi.config.get('admin.forgotPassword.emailTemplate'),
      {
        url,
        user: _.pick(user, ['email', 'firstname', 'lastname', 'username']),
      }
    )
    .catch((err: unknown) => {
      // log error server side but do not disclose it to the user to avoid leaking informations
      strapi.log.error(err);
    });
};

/**
 * Reset a user password
 * @param resetPasswordToken token generated to request a password reset
 * @param password new user password
 */
const resetPassword = async (
  { resetPasswordToken, password } = {} as { resetPasswordToken: string; password: string }
) => {
  const matchingUser: AdminUser | undefined = await strapi.db
    .query('admin::user')
    .findOne({ where: { resetPasswordToken, isActive: true } });

  if (!matchingUser) {
    throw new ApplicationError();
  }

  await assertResetPasswordTokenIsValid(matchingUser);

  return getService('user').updateById(matchingUser.id, {
    password,
    resetPasswordToken: null,
    resetPasswordTokenExpiresAt: null,
  });
};

export default { checkCredentials, validatePassword, hashPassword, forgotPassword, resetPassword };
export { getResetPasswordTokenTTL, assignResetPasswordToken, assertResetPasswordTokenIsValid };
