'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const uuid = require('uuid/v4');

module.exports = async cb => {
  if (!_.get(strapi.plugins['users-permissions'], 'config.jwtSecret')) {
    try {
      const jwtSecret = uuid();

      fs.writeFileSync(path.join(strapi.config.appPath, 'plugins', 'users-permissions', 'config', 'jwt.json'), JSON.stringify({
        jwtSecret
      }, null, 2), 'utf8');

      _.set(strapi.plugins['users-permissions'], 'config.jwtSecret', jwtSecret);
    } catch(err) {
      strapi.log.error(err);
    }
  }

  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'users-permissions'
  });

  if (!await pluginStore.get({key: 'grant'})) {
    const value = {
      email: {
        enabled: true,
        icon: 'envelope'
      },
      facebook: {
        enabled: false,
        icon: 'facebook-official',
        key: '',
        secret: '',
        callback: '/auth/facebook/callback',
        scope: ['email']
      },
      google: {
        enabled: false,
        icon: 'google',
        key: '',
        secret: '',
        callback: '/auth/google/callback',
        scope: ['email']
      },
      github: {
        enabled: false,
        icon: 'github',
        key: '',
        secret: '',
        redirect_uri: '/auth/github/callback',
        scope: [
          'user',
          'user:email'
        ]
      },
      twitter: {
        enabled: false,
        icon: 'twitter',
        key: '',
        secret: '',
        callback: '/auth/twitter/callback'
      }
    };

    await pluginStore.set({key: 'grant', value});
  }

  if (!await pluginStore.get({key: 'email'})) {
    const value = {
      'reset_password': {
        display: 'Email.template.reset_password',
        icon: 'refresh',
        options: {
          from: {
            name: 'Administration Panel',
            email: 'no-reply@strapi.io'
          },
          response_email: '',
          object: '­Reset password 🔑 ',
          message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p><%= URL %>?code=<%= TOKEN %></p>

<p>Thanks.</p>`
        }
      }
    };

    await pluginStore.set({key: 'email', value});
  }

  if (!await pluginStore.get({key: 'advanced'})) {
    const value = {
      unique_email: true,
      allow_register: true
    };

    await pluginStore.set({key: 'advanced', value});
  }

  strapi.plugins['users-permissions'].services.userspermissions.syncSchema(() => {
    strapi.plugins['users-permissions'].services.userspermissions.initialize(cb);
  });
};
