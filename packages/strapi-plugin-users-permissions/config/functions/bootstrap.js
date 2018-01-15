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
          callback: '/auth/github/callback'
        },
        linkedin2: {
          key: '',
          secret: '',
          callback: '/auth/linkedin2/callback',
          custom_params: {
            'state': ''
          }
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

  if (!_.get(strapi.plugins['users-permissions'], 'config.email')) {
    try {
      const email = {
        'validation_email': {
          enabled: true,
          display: 'Email.template.validation_email',
          icon: 'envelope',
          options: {
            from: {
              email: '',
              name: ''
            },
            respond: '',
            object: '',
            message: ''
          }
        },
        'reset_password': {
          enabled: true,
          display: 'Email.template.reset_password',
          icon: 'refresh',
          options: {
            from: {
              email: '',
              name: ''
            },
            respond: '',
            object: '',
            message: ''
          }
        },
        'success_register': {
          enabled: true,
          display: 'Email.template.success_register',
          icon: 'check',
          options: {
            from: {
              email: '',
              name: ''
            },
            respond: '',
            object: '',
            message: ''
          }
        }
      };

      fs.writeFileSync(path.join(strapi.config.appPath, 'plugins', 'users-permissions', 'config', 'email.json'), JSON.stringify({
        email
      }, null, 2), 'utf8');

       _.set(strapi.plugins['users-permissions'], 'config.email', email);
    } catch(err) {
      strapi.log.error(err);
    }
  }

  strapi.plugins['users-permissions'].services.userspermissions.syncSchema(() => {
    strapi.plugins['users-permissions'].services.userspermissions.updatePermissions(cb);
  });
};
