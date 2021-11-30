'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */
const _ = require('lodash');
const uuid = require('uuid/v4');
const { getService } = require('../utils');

const usersPermissionsActions = require('./users-permissions-actions');

module.exports = async ({ strapi }) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });

  await initGrant(pluginStore);
  await initEmails(pluginStore);
  await initAdvancedOptions(pluginStore);

  await strapi.admin.services.permission.actionProvider.registerMany(
    usersPermissionsActions.actions
  );

  await getService('users-permissions').initialize();

  if (!strapi.config.get('plugin.users-permissions.jwtSecret')) {
    const jwtSecret = uuid();
    strapi.config.set('plugin.users-permissions.jwtSecret', jwtSecret);

    if (!process.env.JWT_SECRET) {
      strapi.fs.appendFile('.env', `JWT_SECRET=${jwtSecret}\n`);
    }
  }
};

const initGrant = async pluginStore => {
  const apiPrefix = strapi.config.get('api.rest.prefix');
  const baseURL = `${strapi.config.server.url}/${apiPrefix}/auth`;

  const grantConfig = {
    email: {
      enabled: true,
      icon: 'envelope',
    },
    discord: {
      enabled: false,
      icon: 'discord',
      key: '',
      secret: '',
      callback: `${baseURL}/discord/callback`,
      scope: ['identify', 'email'],
    },
    facebook: {
      enabled: false,
      icon: 'facebook-square',
      key: '',
      secret: '',
      callback: `${baseURL}/facebook/callback`,
      scope: ['email'],
    },
    google: {
      enabled: false,
      icon: 'google',
      key: '',
      secret: '',
      callback: `${baseURL}/google/callback`,
      scope: ['email'],
    },
    github: {
      enabled: false,
      icon: 'github',
      key: '',
      secret: '',
      callback: `${baseURL}/github/callback`,
      scope: ['user', 'user:email'],
    },
    microsoft: {
      enabled: false,
      icon: 'windows',
      key: '',
      secret: '',
      callback: `${baseURL}/microsoft/callback`,
      scope: ['user.read'],
    },
    twitter: {
      enabled: false,
      icon: 'twitter',
      key: '',
      secret: '',
      callback: `${baseURL}/twitter/callback`,
    },
    instagram: {
      enabled: false,
      icon: 'instagram',
      key: '',
      secret: '',
      callback: `${baseURL}/instagram/callback`,
      scope: ['user_profile'],
    },
    vk: {
      enabled: false,
      icon: 'vk',
      key: '',
      secret: '',
      callback: `${baseURL}/vk/callback`,
      scope: ['email'],
    },
    twitch: {
      enabled: false,
      icon: 'twitch',
      key: '',
      secret: '',
      callback: `${baseURL}/twitch/callback`,
      scope: ['user:read:email'],
    },
    linkedin: {
      enabled: false,
      icon: 'linkedin',
      key: '',
      secret: '',
      callback: `${baseURL}/linkedin/callback`,
      scope: ['r_liteprofile', 'r_emailaddress'],
    },
    cognito: {
      enabled: false,
      icon: 'aws',
      key: '',
      secret: '',
      subdomain: 'my.subdomain.com',
      callback: `${baseURL}/cognito/callback`,
      scope: ['email', 'openid', 'profile'],
    },
    reddit: {
      enabled: false,
      icon: 'reddit',
      key: '',
      secret: '',
      state: true,
      callback: `${baseURL}/reddit/callback`,
      scope: ['identity'],
    },
    auth0: {
      enabled: false,
      icon: '',
      key: '',
      secret: '',
      subdomain: 'my-tenant.eu',
      callback: `${baseURL}/auth0/callback`,
      scope: ['openid', 'email', 'profile'],
    },
    cas: {
      enabled: false,
      icon: 'book',
      key: '',
      secret: '',
      callback: `${baseURL}/cas/callback`,
      scope: ['openid email'], // scopes should be space delimited
      subdomain: 'my.subdomain.com/cas',
    },
  };

  const prevGrantConfig = (await pluginStore.get({ key: 'grant' })) || {};
  // store grant auth config to db
  // when plugin_users-permissions_grant is not existed in db
  // or we have added/deleted provider here.
  if (!prevGrantConfig || !_.isEqual(_.keys(prevGrantConfig), _.keys(grantConfig))) {
    // merge with the previous provider config.
    _.keys(grantConfig).forEach(key => {
      if (key in prevGrantConfig) {
        grantConfig[key] = _.merge(grantConfig[key], prevGrantConfig[key]);
      }
    });
    await pluginStore.set({ key: 'grant', value: grantConfig });
  }
};

const initEmails = async pluginStore => {
  if (!(await pluginStore.get({ key: 'email' }))) {
    const value = {
      reset_password: {
        display: 'Email.template.reset_password',
        icon: 'sync',
        options: {
          from: {
            name: 'Administration Panel',
            email: 'no-reply@strapi.io',
          },
          response_email: '',
          object: 'Reset password',
          message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>
<p><%= URL %>?code=<%= TOKEN %></p>

<p>Thanks.</p>`,
        },
      },
      email_confirmation: {
        display: 'Email.template.email_confirmation',
        icon: 'check-square',
        options: {
          from: {
            name: 'Administration Panel',
            email: 'no-reply@strapi.io',
          },
          response_email: '',
          object: 'Account confirmation',
          message: `<p>Thank you for registering!</p>

<p>You have to confirm your email address. Please click on the link below.</p>

<p><%= URL %>?confirmation=<%= CODE %></p>

<p>Thanks.</p>`,
        },
      },
    };

    await pluginStore.set({ key: 'email', value });
  }
};

const initAdvancedOptions = async pluginStore => {
  if (!(await pluginStore.get({ key: 'advanced' }))) {
    const value = {
      unique_email: true,
      allow_register: true,
      email_confirmation: false,
      email_reset_password: null,
      email_confirmation_redirection: null,
      default_role: 'authenticated',
    };

    await pluginStore.set({ key: 'advanced', value });
  }
};
