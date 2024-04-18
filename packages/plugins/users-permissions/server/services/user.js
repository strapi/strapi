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
const { toNumber, getOr } = require('lodash/fp');
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
   * Hash password in values if present
   * TODO: Remove this and replace db calls with docservice once it supports targeting entityId
   *
   * @return {object} values with a hashed password if property is present
   */
  ensureHashedPassword(values) {
    if ('password' in values) {
      values.password = this.hashPassword(values.password);
    }

    return values;
  },

  /**
   * Hash a given password using bcrypt.
   *
   * The number of rounds used for the bcrypt algorithm is either the value set in the password attribute's
   * encryption.rounds property, or 10 if no custom value has been set.
   *
   * @param {string} password - The password to hash.
   * @return {string} The hashed password.
   */
  hashPassword(password) {
    const passwordAttribute = strapi.getModel(USER_MODEL_UID).attributes.password;

    // Check if a custom encryption.rounds has been set on the password attribute
    const rounds = toNumber(
      getOr(10, 'encryption.rounds', {
        passwordAttribute,
      })
    );
    return bcrypt.hashSync(password, rounds);
  },

  /**
   * Promise to add a/an user.
   * @return {Promise}
   */
  async add(values) {
    return strapi.db.query(USER_MODEL_UID).create({
      data: await this.ensureHashedPassword(values),
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
      data: await this.ensureHashedPassword(params),
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
