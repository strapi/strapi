'use strict';

/**
 * User.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const urlJoin = require('url-join');

const { sanitize } = require('@strapi/utils');
const { getService } = require('../utils');

const USER_MODEL_UID = 'plugin::users-permissions.user';

module.exports = ({ strapi }) => ({
  /**
   * Promise to count users
   *
   * @return {Promise}
   */

  count(params) {
    return strapi.db.query(USER_MODEL_UID).count({ where: params });
  },

  /**
   * Promise to search count users
   *
   * @return {Promise}
   */

  /**
   * Promise to add a/an user.
   * @return {Promise}
   */
  async add(values) {
    return strapi.db.query(USER_MODEL_UID).create({
      data: values,
      populate: ['role'],
    });
  },

  /**
   * Promise to edit a/an user.
   * @param {string} userId
   * @param {object} params
   * @return {Promise}
   */
  async edit(userId, params = {}) {
    return strapi.db.query(USER_MODEL_UID).update({
      where: { id: userId },
      data: params,
      populate: ['role'],
    });
  },

  /**
   * Promise to fetch a/an user.
   * @return {Promise}
   */
  fetch(id, params) {
    const query = strapi.get('query-params').transform(USER_MODEL_UID, params ?? {});

    return strapi.db.query(USER_MODEL_UID).findOne({
      ...query,
      where: {
        $and: [{ id }, query.where || {}],
      },
    });
  },

  /**
   * Promise to fetch authenticated user.
   * @return {Promise}
   */
  fetchAuthenticatedUser(id) {
    return strapi.db.query(USER_MODEL_UID).findOne({ where: { id }, populate: ['role'] });
  },

  /**
   * Promise to fetch all users.
   * @return {Promise}
   */
  fetchAll(params) {
    const query = strapi.get('query-params').transform(USER_MODEL_UID, params ?? {});

    return strapi.db.query(USER_MODEL_UID).findMany(query);
  },

  /**
   * Promise to remove a/an user.
   * @return {Promise}
   */
  async remove(params) {
    return strapi.db.query(USER_MODEL_UID).delete({ where: params });
  },

  validatePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  async sendConfirmationEmail(user) {
    const userPermissionService = getService('users-permissions');
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const userSchema = strapi.getModel(USER_MODEL_UID);

    const settings = await pluginStore
      .get({ key: 'email' })
      .then((storeEmail) => storeEmail.email_confirmation.options);

    // Sanitize the template's user information
    const sanitizedUserInfo = await sanitize.sanitizers.defaultSanitizeOutput(userSchema, user);

    const confirmationToken = crypto.randomBytes(20).toString('hex');

    await this.edit(user.id, { confirmationToken });

    const apiPrefix = strapi.config.get('api.rest.prefix');

    try {
      settings.message = await userPermissionService.template(settings.message, {
        URL: urlJoin(
          strapi.config.get('server.absoluteUrl'),
          apiPrefix,
          '/auth/email-confirmation'
        ),
        SERVER_URL: strapi.config.get('server.absoluteUrl'),
        ADMIN_URL: strapi.config.get('admin.absoluteUrl'),
        USER: sanitizedUserInfo,
        CODE: confirmationToken,
      });

      settings.object = await userPermissionService.template(settings.object, {
        USER: sanitizedUserInfo,
      });
    } catch {
      strapi.log.error(
        '[plugin::users-permissions.sendConfirmationEmail]: Failed to generate a template for "user confirmation email". Please make sure your email template is valid and does not contain invalid characters or patterns'
      );
      return;
    }

    // Send an email to the user.
    await strapi
      .plugin('email')
      .service('email')
      .send({
        to: user.email,
        from:
          settings.from.email && settings.from.name
            ? `${settings.from.name} <${settings.from.email}>`
            : undefined,
        replyTo: settings.response_email,
        subject: settings.object,
        text: settings.message,
        html: settings.message,
      });
  },
});
