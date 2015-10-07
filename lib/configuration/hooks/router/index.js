'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

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
      routes: {}
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
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

      // Middleware used for every routes.
      // Expose the endpoint in `this`.
      function globalPolicy(endpoint, route) {
        return function * (next) {
          this.request.route = {
            endpoint: endpoint,
            controller: route.controller,
            firstWord: _.startsWith(route.endpoint, '/') ? route.endpoint.split('/')[1] : route.endpoint.split('/')[0],
            value: route
          };
          yield next;
        };
      }

      // Parse each route from the user config, load policies if any
      // and match the controller and action to the desired endpoint.
      _.forEach(strapi.config.routes, function (value, endpoint) {
        try {
          route = regex.detectRoute(endpoint);
          controller = strapi.controllers[value.controller.toLowerCase()];
          action = controller[value.action];
          policies = [];

          // Add the `globalPolicy`.
          policies.push(globalPolicy(endpoint, route));

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

      // Little hack to serve the admin panel on `./admin` waiting for
      // this PR to be merged: https://github.com/koajs/static/pull/51.
      strapi.router.get('/admin', function * () {
        this.status = 301;
        yield strapi.middlewares.send(this, path.resolve(strapi.config.appPath, strapi.config.paths.static, 'admin', 'index.html'));
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

      cb();
    },

    /**
     * Reload the hook
     */

    reload: function () {
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
