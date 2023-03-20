'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const urlJoin = require('url-join');

const { getAbsoluteServerUrl } = require('@strapi/utils');
const { getService } = require('../utils');

module.exports = ({ strapi }) => {
  /**
   * Helper to get profiles
   *
   * @param {String}   provider
   */

  const getProfile = async (provider, query) => {
    const accessToken = query.access_token || query.code || query.oauth_token;

    const providers = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get();

    return getService('providers-registry').run({
      provider,
      query,
      accessToken,
      providers,
    });
  };

  /**
   * Connect thanks to a third-party provider.
   *
   *
   * @param {String}    provider
   * @param {String}    accessToken
   *
   * @return  {*}
   */

  const connect = async (provider, query) => {
    const accessToken = query.access_token || query.code || query.oauth_token;

    if (!accessToken) {
      throw new Error('No access_token.');
    }

    // Get the profile.
    const profile = await getProfile(provider, query);

    const email = _.toLower(profile.email);

    // We need at least the mail.
    if (!email) {
      throw new Error('Email was not available.');
    }

    const users = await strapi.query('plugin::users-permissions.user').findMany({
      where: { email },
    });

    const advancedSettings = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const user = _.find(users, { provider });

    if (_.isEmpty(user) && !advancedSettings.allow_register) {
      throw new Error('Register action is actually not available.');
    }

    if (!_.isEmpty(user)) {
      return user;
    }

    if (users.length && advancedSettings.unique_email) {
      throw new Error('Email is already taken.');
    }

    // Retrieve default role.
    const defaultRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: advancedSettings.default_role } });

    // Create the new user.
    const newUser = {
      ...profile,
      email, // overwrite with lowercased email
      provider,
      role: defaultRole.id,
      confirmed: true,
    };

    const createdUser = await strapi
      .query('plugin::users-permissions.user')
      .create({ data: newUser });

    return createdUser;
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
