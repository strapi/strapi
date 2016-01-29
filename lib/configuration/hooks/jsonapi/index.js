'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local Strapi dependencies.
const request = require('./helpers/request');
const response = require('./helpers/response');

/**
 * JSON API hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      function * _interceptor(next) {
        const self = this;

        // Wait for downstream middleware/handlers to execute to build the response
        yield next;

        // Exclude administration routes
        if (this.request.url.indexOf('admin') === -1) {
          // Verify Content-Type header
          if (this.request.type !== 'application/vnd.api+json') {
            this.status = 406;
            this.body = '';
          } else if (_.startsWith(this.status, '2')) {
            // Intercept success requests

            // Detect route
            const matchedRoute = _.find(strapi.router.stack, function (stack) {
              if (new RegExp(stack.regexp).test(self.request.url) && _.includes(stack.methods, self.request.method.toUpperCase())) {
                return stack;
              }
            });

            if (!_.isUndefined(matchedRoute)) {
              // Handlers set the response body
              const actionRoute = strapi.config.routes[self.request.method.toUpperCase() + ' ' + matchedRoute.path];

              if (!_.isUndefined(actionRoute)) {
                response.set(this, matchedRoute, actionRoute);
              }
            }
          } else {
            // Intercept error requests
            this.body = {
              error: this.body
            };
          }
        }
      }

      if ((_.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.enabled === true) || (_.isBoolean(strapi.config.jsonapi) && strapi.config.jsonapi === true)) {
        strapi.app.use(_interceptor);
      }

      cb();
    },

    /**
     * Parse request and attributes
     */

    parse: function (strapi) {
      return function * (next) {
        // Verify Content-Type header and exclude administration and user routes
        if (this.request.url.indexOf('admin') !== -1 && !(_.isPlainObject(strapi.config.jsonapi) && strapi.config.jsonapi.enabled === true)) {
          yield next;
        } else if (this.request.type !== 'application/vnd.api+json') {
          this.response.status = 406;
          this.response.body = '';
        } else {
          try {
            yield request.parse(this);
            yield next;
          } catch (err) {
            _.assign(this.response, err);
          }
        }
      };
    }
  };

  return hook;
};
