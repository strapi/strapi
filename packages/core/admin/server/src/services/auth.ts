import bcrypt from 'bcryptjs';
import _ from 'lodash';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import type { AdminUser } from '../../../shared/contracts/shared';
import '@strapi/types';

const { ApplicationError } = errors;

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

  const resetPasswordToken = getService('token').createToken();
  await getService('user').updateById(user.id, { resetPasswordToken });

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

  return getService('user').updateById(matchingUser.id, {
    password,
    resetPasswordToken: null,
  });
};

export default { checkCredentials, validatePassword, hashPassword, forgotPassword, resetPassword };
