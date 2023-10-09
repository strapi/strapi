import bcrypt from 'bcryptjs';
import _ from 'lodash';
import { getAbsoluteAdminUrl, errors } from '@strapi/utils';
import { getService } from '../utils';
import { type AdminUser } from '../domain/user';
import '@strapi/types';

const { ApplicationError } = errors;

/**
 * hashes a password
 */
const hashPassword = (password: string) => bcrypt.hash(password, 10);

/**
 * Validate a password
 */
const validatePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/**
 * Check login credentials
 */
const checkCredentials = async ({ email, password }: { email: string; password: string }) => {
  const user: AdminUser = await strapi.query('admin::user').findOne({ where: { email } });

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
 */
const forgotPassword = async ({ email } = {} as { email: string }) => {
  const user: AdminUser = await strapi
    .query('admin::user')
    .findOne({ where: { email, isActive: true } });
  if (!user) {
    return;
  }

  const resetPasswordToken = getService('token').createToken();
  await getService('user').updateById(user.id, { resetPasswordToken });

  // Send an email to the admin.
  const url = `${getAbsoluteAdminUrl(
    strapi.config
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
    .catch((err: any) => {
      // log error server side but do not disclose it to the user to avoid leaking informations
      strapi.log.error(err);
    });
};

/**
 * Reset a user password
 */
const resetPassword = async (
  { resetPasswordToken, password } = {} as { resetPasswordToken: string; password: string }
) => {
  const matchingUser: AdminUser = await strapi
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

export { checkCredentials, validatePassword, hashPassword, forgotPassword, resetPassword };
