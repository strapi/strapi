'use strict';

/**
 * Module dependencies
 */

// Local dependencies.
const explorerActions = require('./explorer/index');
const routesActions = require('./routes/index');
const configActions = require('./config/index');

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
          policies: ['dashboardToken', 'isAuthorized']
        },
        'POST /dashboard/explorer/:model': {
          controller: explorerActions.create,
          policies: ['dashboardToken', 'isAuthorized']
        },
        'DELETE /dashboard/explorer/:model/:id': {
          controller: explorerActions.destroy,
          policies: ['dashboardToken', 'isAuthorized']
        },
        'GET /dashboard/explorer/:model': {
          controller: explorerActions.find,
          policies: ['dashboardToken', 'isAuthorized']
        },
        'GET /dashboard/explorer/:model/:id': {
          controller: explorerActions.findOne,
          policies: ['dashboardToken', 'isAuthorized']
        },
        'PUT /dashboard/explorer/:model/:id': {
          controller: explorerActions.update,
          policies: ['dashboardToken', 'isAuthorized']
        },
        'GET /dashboard/routes': {
          controller: routesActions.find,
          action: 'find',
          policies: ['dashboardToken', 'isAuthorized']
        },
        'PUT /dashboard/routes': {
          controller: routesActions.update,
          action: 'update',
          policies: ['dashboardToken', 'isAuthorized']
        },
        'GET /dashboard/config': {
          controller: configActions.config,
          action: 'index',
          policies: ['dashboardToken']
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
