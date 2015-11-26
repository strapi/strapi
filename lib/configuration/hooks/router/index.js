'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

// Public node modules.
const _ = require('lodash');

// Local utilities.
const regex = require('../../../../util/regex');

/**
 * Router hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      prefix: '',
      routes: {},
      graphql: {
        enabled: true,
        route: '/graphql'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {

      // Middleware used for every routes.
      // Expose the endpoint in `this`.
      function globalPolicy(endpoint, value, route) {
        return function * (next) {
          this.request.route = {
            endpoint: _.trim(endpoint),
            controller: _.trim(value.controller),
            action: _.trim(value.action),
            splittedEndpoint: _.trim(route.endpoint),
            verb: route.verb && _.trim(route.verb.toLowerCase())
          };
          yield next;
        };
      }

      if (((cluster.isWorker && strapi.config.reload.workers > 0) || (cluster.isMaster && strapi.config.reload.workers < 1)) || (!strapi.config.reload && cluster.isMaster)) {
        let route;
        let controller;
        let action;
        let policies = [];

        // Initialize the router.
        if (!strapi.router) {
          strapi.router = strapi.middlewares.router({
            prefix: strapi.config.prefix
          });
        }

        // Parse each route from the user config, load policies if any
        // and match the controller and action to the desired endpoint.
        _.forEach(strapi.config.routes, function (value, endpoint) {
          try {
            route = regex.detectRoute(endpoint);

            // Check if the controller is a function.
            if (typeof value.controller === 'function') {
              action = value.controller;
            } else {
              controller = strapi.controllers[value.controller.toLowerCase()];
              action = controller[value.action];
            }

            // Init policies array.
            policies = [];

            // Add the `globalPolicy`.
            policies.push(globalPolicy(endpoint, value, route));

            if (_.isArray(value.policies) && !_.isEmpty(value.policies)) {
              _.forEach(value.policies, function (policy) {
                if (strapi.policies[policy]) {
                  policies.push(strapi.policies[policy]);
                } else {
                  strapi.log.error('Ignored attempt to bind route `' + endpoint + '` with unknown policy `' + policy + '`.');
                  process.exit(1);
                }
              });
            }
            strapi.router[route.verb.toLowerCase()](route.endpoint, strapi.middlewares.compose(policies), action);
          } catch (err) {
            strapi.log.warn('Ignored attempt to bind route `' + endpoint + '` to unknown controller/action.');
          }
        });

        // Define GraphQL route with modified Waterline models to GraphQL schema
        // or disable the global variable
        if (strapi.config.graphql.enabled === true) {
          // Wait GraphQL schemas generation
          strapi.once('waterline:graphql:ready', function () {
            strapi.router.get(strapi.config.graphql.route, strapi.middlewares.graphql({
              schema: strapi.schemas,
              pretty: true
            }));
          });
        } else {
          global.graphql = undefined;
        }

        // Let the router use our routes and allowed methods.
        strapi.app.use(strapi.router.routes());
        strapi.app.use(strapi.router.allowedMethods());

        // Handle router errors.
        strapi.app.use(function * (next) {
          try {
            yield next;
            const status = this.status || 404;
            if (status === 404) {
              this.throw(404);
            }
          } catch (err) {
            err.status = err.status || 500;
            err.message = err.expose ? err.message : 'Houston, we have a problem.';

            this.status = err.status;
            this.body = {
              code: err.status,
              message: err.message
            };

            this.app.emit('error', err, this);
          }
        });
      }

      cb();
    },

    /**
     * Reload the hook
     */

    reload: function () {
      delete strapi.router;

      hook.initialize(function (err) {
        if (err) {
          strapi.log.error('Failed to reinitialize the router.');
          strapi.stop();
        } else {
          strapi.emit('hook:router:reloaded');
        }
      });
    }
  };

  return hook;
};
