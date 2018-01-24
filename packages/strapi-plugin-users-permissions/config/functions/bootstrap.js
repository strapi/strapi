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

module.exports = cb => {
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

  if (!_.get(strapi.plugins['users-permissions'], 'config.grant')) {
    try {
      const grant = {
        facebook: {
          key: '',
          secret: '',
          callback: '/auth/facebook/callback',
          scope: ['email']
        },
        google: {
          key: '',
          secret: '',
          callback: '/auth/google/callback',
          scope: ['email']
        },
        github: {
          key: '',
          secret: '',
          redirect_uri: '/auth/google/callback',
          scope: [
            'user',
            'user:email'
          ]
        },
        twitter: {
          key: '',
          secret: '',
          callback: '/auth/twitter/callback'
        }
      };

      fs.writeFileSync(path.join(strapi.config.appPath, 'plugins', 'users-permissions', 'config', 'grant.json'), JSON.stringify({
        grant
      }, null, 2), 'utf8');

       _.set(strapi.plugins['users-permissions'], 'config.grant', grant);
    } catch(err) {
      strapi.log.error(err);
    }
  }

  strapi.plugins['users-permissions'].services.userspermissions.syncSchema(() => {
    strapi.plugins['users-permissions'].services.userspermissions.initialize(cb);
  });
};
