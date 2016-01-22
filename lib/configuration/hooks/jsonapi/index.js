'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const response = require('./helpers/response');

/**
 * JSON API hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      jsonapi: {}
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      // TODO:
      // - Force or not the routes?
      // - Add middleware before called the controller action to check parameters structure

      function * interceptor(next) {
        const self = this;

        // Wait for downstream middleware/handlers to execute to build the response
        yield next;

        // Verify Content-Type header
        if (this.request.type !== 'application/vnd.api+json') {
          this.status = 406;
          this.body = '';
        }

        // Detect route
        const matchedRoute = _.find(strapi.router.stack, function (stack) {
          if (new RegExp(stack.regexp).test(self.request.url) && _.includes(stack.methods, self.request.method.toUpperCase())) {
            return stack;
          }
        });

        // Handlers set the response body
        if (!_.isUndefined(matchedRoute)) {
          const actionRoute = strapi.config.routes[self.request.method.toUpperCase() + ' ' + matchedRoute.path];

          if (!_.isUndefined(actionRoute)) {
            response.set(this, matchedRoute, actionRoute);
          }
        }
      }

      strapi.app.use(interceptor);

      cb();
    }
  };

  return hook;
};
