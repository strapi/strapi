'use strict';

/**
 * Module dependencies.
 */

// Public node modules.
const _ = require('lodash');
const urlJoin = require('url-join');

const { getAbsoluteServerUrl } = require('@strapi/utils');

module.exports = ({ strapi }) => {
  // lazy load heavy dependencies
  const providerRequest = require('./providers-list');

  /**
   * Helper to get profiles
   *
   * @param {String}   provider
   * @param {Function} callback
   */

  const getProfile = async (provider, query, callback) => {
    const access_token = query.access_token || query.code || query.oauth_token;

    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    await providerRequest({ provider, query, callback, access_token, providers });
  };

  /**
   * Connect thanks to a third-party provider.
   *
   *
   * @param {String}    provider
   * @param {String}    access_token
   *
   * @return  {*}
   */

  const connect = (provider, query) => {
    const access_token = query.access_token || query.code || query.oauth_token;

    return new Promise((resolve, reject) => {
      if (!access_token) {
        return reject([null, { message: 'No access_token.' }]);
      }

      // Get the profile.
      getProfile(provider, query, async (err, profile) => {
        if (err) {
          return reject([null, err]);
        }

        const email = _.toLower(profile.email);

        // We need at least the mail.
        if (!email) {
          return reject([null, { message: 'Email was not available.' }]);
        }

        try {
          const users = await strapi.query('plugin::users-permissions.user').findMany({
            where: { email },
          });

          const advanced = await strapi
            .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
            .get();

          const user = _.find(users, { provider });

          if (_.isEmpty(user) && !advanced.allow_register) {
            return resolve([
              null,
              [{ messages: [{ id: 'Auth.advanced.allow_register' }] }],
              'Register action is actually not available.',
            ]);
          }

          if (!_.isEmpty(user)) {
            return resolve([user, null]);
          }

          if (
            !_.isEmpty(_.find(users, user => user.provider !== provider)) &&
            advanced.unique_email
          ) {
            return resolve([
              null,
              [{ messages: [{ id: 'Auth.form.error.email.taken' }] }],
              'Email is already taken.',
            ]);
          }

          // Retrieve default role.
          const defaultRole = await strapi
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: advanced.default_role } });

          // Create the new user.
          const params = {
            ...profile,
            email, // overwrite with lowercased email
            provider,
            role: defaultRole.id,
            confirmed: true,
          };

          const createdUser = await strapi
            .query('plugin::users-permissions.user')
            .create({ data: params });

          return resolve([createdUser, null]);
        } catch (err) {
          reject([null, err]);
        }
      });
    });
  };

  const buildRedirectUri = (provider = '') => {
    const apiPrefix = strapi.config.get('api.rest.prefix');
    return urlJoin(getAbsoluteServerUrl(strapi.config), apiPrefix, 'connect', provider, 'callback');
  };

  return {
    connect,
    buildRedirectUri,
  };
};
