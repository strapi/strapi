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
      strapi.app.use(strapi.middlewares.passport.session());

      strapi.middlewares.passport.serializeUser(function (user, done) {
        done(null, user.id);
      });

      strapi.middlewares.passport.deserializeUser(function (id, done) {
        strapi.orm.collections.user.findById(id, done);
      });

      cb();
    }
  };

  return hook;
};
