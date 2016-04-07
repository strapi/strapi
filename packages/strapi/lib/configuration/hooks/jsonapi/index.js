'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local helpers and utilities.
const request = require('./helpers/request');
const response = require('./helpers/response');
const utils = require('./utils/');

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

        // Wait for downstream middleware/handlers to execute to build the response
        yield next;

        // Exclude administration routes
        if (this.request.url.indexOf('admin') === -1) {
          if (this.request.type === 'application/vnd.api+json' && _.startsWith(this.status, '2')) {
            // Set required response header
            this.response.type = 'application/vnd.api+json';

            // Intercept success requests

            // Detect route
            const matchedRoute = utils.matchedRoute(this);

            if (!_.isUndefined(matchedRoute)) {

              // Handlers set the response body
              const actionRoute = strapi.config.routes[this.request.method.toUpperCase() + ' ' + matchedRoute.path];

              if (!_.isUndefined(actionRoute)) {
                yield response.set(this, matchedRoute, actionRoute);
              }
            }
          } else if (this.request.type === 'application/vnd.api+json') {

            // Set required response header
            this.response.type = 'application/vnd.api+json';

            // Intercept error requests
            this.body = {
              errors: this.body
            };
          } else if (this.request.type.indexOf('application/vnd.api+json') !== -1) {

            // Right header detected but there are others header too.
            this.status = 406;
            this.body = '';
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

    parse: function () {
      return function * (next) {
        // Verify Content-Type header
        if (this.request.type === 'application/vnd.api+json') {
          // Only one and right header detected.
          try {
            yield request.parse(this);
            yield next;
          } catch (err) {
            _.assign(this.response, err);
          }
        } else if (this.request.type.indexOf('application/vnd.api+json') !== -1) {
          // Right header detected but there are others header too.
          this.response.status = 406;
          this.response.body = '';
        } else {
          yield next;
        }
      };
    }
  };

  return hook;
};
