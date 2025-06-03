import _ from 'lodash';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { isSsoLocked } from '../utils/sso-lock';

const { ApplicationError } = errors;
/**
 * Send an email to the user if it exists and is not locked to SSO
 * If those conditions are not met, nothing happens
 *
 * @param {Object} param params
 * @param {string} param.email user email for which to reset the password
 */
const forgotPassword = async ({ email }: any = {}) => {
  const user = await strapi.db.query('admin::user').findOne({ where: { email, isActive: true } });

  if (!user || (await isSsoLocked(user))) {
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
 * @param {Object} param params
 * @param {string} param.resetPasswordToken token generated to request a password reset
 * @param {string} param.password new user password
 */
const resetPassword = async ({ resetPasswordToken, password }: any = {}) => {
  const matchingUser = await strapi.db
    .query('admin::user')
    .findOne({ where: { resetPasswordToken, isActive: true } });

  if (!matchingUser || (await isSsoLocked(matchingUser))) {
    throw new ApplicationError();
  }

  return getService('user').updateById(matchingUser.id, {
    password,
    resetPasswordToken: null,
  });
};

export default {
  forgotPassword,
  resetPassword,
};
