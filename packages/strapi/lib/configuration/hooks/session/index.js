'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Session hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      session: {
        key: 'myApp',
        secretKeys: ['mySecretKey1'],
        maxAge: 86400000
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.session) && !_.isEmpty(strapi.config.session)) {
        strapi.app.keys = strapi.config.session.secretKeys;
        strapi.app.use(strapi.middlewares.session({
          key: strapi.config.session.key,
          maxAge: strapi.config.session.maxAge
        }, strapi.app));
      }

      cb();
    }
  };

  return hook;
};
