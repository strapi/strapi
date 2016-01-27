'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const request = require('./helpers/request');
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

        // Exclude administration routes
        if (!strapi.api.admin.config.routes.hasOwnProperty(this.request.method + ' ' + this.request.url)) {
          // Verify Content-Type header
          if (this.request.type !== 'application/vnd.api+json') {
            this.status = 406;
            this.body = '';
          } else if (this.request.method === 'GET') {
            // Intercept only GET request

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
        }
      }

      strapi.app.use(interceptor);

      cb();
    },

    /**
     * Parse request and attributes
     */

    parse: function (strapi) {
      return function * (next) {
        const self = this;

        // Verify Content-Type header and exclude administration routes
        if (strapi.api.admin.config.routes.hasOwnProperty(this.request.method + ' ' + this.request.url)) {
          yield next;
        } else if (this.request.type !== 'application/vnd.api+json') {
          this.response.status = 406;
          this.response.body = '';
        } else {
          yield request.parse(this, function * (err) {
            if (err) {
              return _.assign(self.response, err);
            }

            yield next;
          });
        }
      }
    }
  };

  return hook;
};
