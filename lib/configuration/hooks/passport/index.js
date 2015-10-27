'use strict';

/**
 * Passport hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      passport: {
        strategies: {
          local: {
            strategy: 'passport-local'
          }
        }
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      strapi.app.use(strapi.middlewares.passport.initialize());

      cb();
    }
  };

  return hook;
};
