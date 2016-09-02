  'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');

// Public node modules.
const _ = require('lodash');

// Local utilities.
const responsesPolicy = require('../../core/responses/policy');

// Strapi utilities.
const regex = require('strapi-utils').regex;

/**
 * Router hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      prefix: '',
      routes: {}
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {

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

      function routerChecker(value, endpoint, plugin) {
        let action;
        const route = regex.detectRoute(endpoint);

        // Check if the controller is a function.
        if (typeof value.controller === 'function') {
          action = value.controller;
        } else {
          const controller = strapi.controllers[value.controller.toLowerCase()] || strapi.plugins[plugin].controllers[value.controller.toLowerCase()];
          action = controller[value.action];
        }

        // Init policies array.
        const policies = [];

        // Add the `globalPolicy`.
        policies.push(globalPolicy(endpoint, value, route));

        // Add the `responsesPolicy`.
        policies.push(responsesPolicy);

        if (_.isArray(value.policies) && !_.isEmpty(value.policies)) {
          _.forEach(value.policies, policy => {
            if (strapi.policies[policy]) {
              policies.push(strapi.policies[policy]);
            } else {
              strapi.log.error('Ignored attempt to bind route `' + endpoint + '` with unknown policy `' + policy + '`.');
              process.exit(1);
            }
          });
        }

        return {
          route: route,
          policies: policies,
          action: action
        };
      }

      if (((cluster.isWorker && strapi.config.reload.workers > 0) || (cluster.isMaster && strapi.config.reload.workers < 1)) || (!strapi.config.reload && cluster.isMaster)) {
        // Initialize the router.
        if (!strapi.router) {
          strapi.router = strapi.middlewares.router({
            prefix: strapi.config.prefix
          });
        }

        // Add response policy to the global variable.
        _.set(strapi.policies, 'responsesPolicy', responsesPolicy);

        // Parse each route from the user config, load policies if any
        // and match the controller and action to the desired endpoint.
        _.forEach(strapi.config.routes, (value, endpoint) => {
          try {
            const { route, policies, action } = routerChecker(value, endpoint);

            strapi.router[route.verb.toLowerCase()](route.endpoint, strapi.middlewares.compose(policies), action);
          } catch (err) {
            strapi.log.warn('Ignored attempt to bind route `' + endpoint + '` to unknown controller/action.');
          }
        });

        // Parse each plugin's routes.
        _.forEach(strapi.config.plugins.routes, (value, plugin) => {
          try {
            // Create router for each plugin.
            // Prefix router with the plugin's name.
            const router = strapi.middlewares.router({
              prefix: plugin
            });

            // Exclude routes with prefix.
            const excludedRoutes = _.omitBy(value, o => !o.hasOwnProperty('prefix'));

            // Add others routes to the plugin's router.
            _.forEach(_.omit(value, _.keys(excludedRoutes)), (value, endpoint) => {
              const { route, policies, action } = routerChecker(value, endpoint, plugin);

              router[route.verb.toLowerCase()](route.endpoint, strapi.middlewares.compose(policies), action);
            });

            // /!\ Could override main router's routes.
            if (!_.isEmpty(excludedRoutes)) {
              _.forEach(excludedRoutes, (value, endpoint) => {
                const { route, policies, action } = routerChecker(value, endpoint, plugin);

                strapi.router[route.verb.toLowerCase()](route.endpoint, strapi.middlewares.compose(policies), action);
              });
            }

            strapi.router.use(router.routes(), router.allowedMethods());
          } catch (err) {
            strapi.log.warn('Ignored attempt to bind route `' + endpoint + '` to unknown controller/action.');
          }
        });

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
    }
  };
};
