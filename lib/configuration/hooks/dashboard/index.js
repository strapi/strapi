'use strict';

/**
 * Module dependencies
 */

// Local dependencies.
const explorerActions = require('./explorer/index');
const routesActions = require('./routes/index');

/**
 * Public explorer hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      dashboard: {
        enabled: true,
        token: ''
      },
      routes: {
        'GET /dashboard/explorer/:model/count': {
          controller: explorerActions.count,
          policies: ['isAuthorized']
        },
        'POST /dashboard/explorer/:model': {
          controller: explorerActions.create,
          policies: ['isAuthorized']
        },
        'DELETE /dashboard/explorer/:model/:id': {
          controller: explorerActions.destroy,
          policies: ['isAuthorized']
        },
        'GET /dashboard/explorer/:model': {
          controller: explorerActions.find,
          policies: ['isAuthorized']
        },
        'GET /dashboard/explorer/:model/:id': {
          controller: explorerActions.findOne,
          policies: ['isAuthorized']
        },
        'PUT /dashboard/explorer/:model/:id': {
          controller: explorerActions.update,
          policies: ['isAuthorized']
        },
        'GET /dashboard/routes': {
          controller: routesActions.find,
          action: 'find',
          policies: ['isAuthorized']
        },
        'PUT /dashboard/routes': {
          controller: routesActions.update,
          action: 'update',
          policies: ['isAuthorized']
        }
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {

      _.forEach(strapi.hooks.dashboard.defaults.routes, function (route, key) {
        strapi.config.routes[key] = route;
      });

      cb();
    }
  };

  return hook;
};
