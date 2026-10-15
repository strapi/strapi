import _ from 'lodash';
import urlJoin from 'url-join';
import type {
  AdvancedSettings,
  GrantConfig,
  GrantResponse,
  OAuthQuery,
  PluginContext,
  User,
} from '../types';

import { getService, findValidUsername } from '../utils';

/** Resolve provider identities and register users when allowed. */
export default ({ strapi }: PluginContext) => {
  /** Retrieve the provider profile associated with the completed OAuth exchange. */

  const getProfile = async (
    provider: string,
    oauthData: OAuthQuery,
    { grantResponse }: { grantResponse?: GrantResponse } = {}
  ) => {
    const accessToken = oauthData.access_token || oauthData.code || oauthData.oauth_token;

    const providers = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'grant' })
      .get()) as GrantConfig;

    return getService(strapi, 'providers-registry').run({
      provider,
      query: oauthData,
      accessToken,
      providers,
      grantResponse,
    });
  };

  /** Find an existing provider account or register one when registration is enabled. */

  const connect = async (
    provider: string,
    oauthData: OAuthQuery,
    { grantResponse }: { grantResponse?: GrantResponse } = {}
  ) => {
    const accessToken = oauthData.access_token || oauthData.code || oauthData.oauth_token;
    const idToken = oauthData.id_token;

    if (!accessToken && !idToken) {
      throw new Error('No access_token.');
    }

    // Get the profile.
    const profile = await getProfile(provider, oauthData, { grantResponse });

    const email = _.toLower(profile.email);

    // We need at least the mail.
    if (!email) {
      throw new Error('Email was not available.');
    }

    const users: User[] = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { email },
    });

    const advancedSettings = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()) as AdvancedSettings;

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
    const defaultRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: advancedSettings.default_role } });

    // Username: prefer profile, else email prefix; findValidUsername ensures valid + unique
    const base = (profile.username && profile.username.trim()) || email.split('@')[0];
    const username = await findValidUsername(strapi, base);

    // Create the new user.
    const newUser = {
      ...profile,
      username, // use the generated or provided username
      email, // overwrite with lowercased email
      provider,
      role: defaultRole.id,
      confirmed: true,
    };

    const createdUser = await strapi.db
      .query('plugin::users-permissions.user')
      .create({ data: newUser });

    return createdUser;
  };

  const buildRedirectUri = (provider = '') => {
    const apiPrefix = strapi.config.get<string>('api.rest.prefix');
    return urlJoin(
      strapi.config.get<string>('server.absoluteUrl'),
      apiPrefix,
      'connect',
      provider,
      'callback'
    );
  };

  return {
    connect,
    buildRedirectUri,
  };
};
