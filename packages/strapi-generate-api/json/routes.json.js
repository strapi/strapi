'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Expose main routes of the generated API
 */

module.exports = function dataForRoutesJSON(scope) {
  const newRoutes = {
    routes: {}
  };

  // JSON API support is enabled or not.
  let hasJSONAPI = false;

  try {
    const JSONAPI = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'config', 'general.json'))).jsonapi;

    if (_.isPlainObject(JSONAPI) && _.get(JSONAPI, 'enabled') === true) {
      hasJSONAPI = true;
    }
  } catch (err) {
    throw err;
  }

  // JSON API enabled
  if (hasJSONAPI) {
    newRoutes.routes['GET /' + scope.idPluralized] = {
      controller: scope.globalID,
      action: 'find',
      policies: []
    };

    newRoutes.routes['GET /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'findOne',
      policies: []
    };

    newRoutes.routes['GET /' + scope.id + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'findOne',
      policies: []
    };

    newRoutes.routes['GET /' + scope.id + '/:id/:relation'] = {
      controller: scope.globalID,
      action: 'findOne',
      policies: []
    };

    newRoutes.routes['POST /' + scope.id] = {
      controller: scope.globalID,
      action: 'create',
      policies: []
    };

    newRoutes.routes['PATCH /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'update',
      policies: []
    };

    newRoutes.routes['DELETE /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'destroy',
      policies: []
    };

    newRoutes.routes['POST /' + scope.id + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'createRelation',
      policies: []
    };

    newRoutes.routes['PATCH /' + scope.id + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'updateRelation',
      policies: []
    };

    newRoutes.routes['DELETE /' + scope.id + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'destroyRelation',
      policies: []
    };
  } else {
    newRoutes.routes['GET /' + scope.id] = {
      controller: scope.globalID,
      action: 'find',
      policies: []
    };

    newRoutes.routes['GET /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'findOne',
      policies: []
    };

    newRoutes.routes['POST /' + scope.id] = {
      controller: scope.globalID,
      action: 'create',
      policies: []
    };

    newRoutes.routes['PUT /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'update',
      policies: []
    };

    newRoutes.routes['DELETE /' + scope.id + '/:id'] = {
      controller: scope.globalID,
      action: 'destroy',
      policies: []
    };

    newRoutes.routes['POST /' + scope.id + '/:parentId/:relation'] = {
      controller: scope.globalID,
      action: 'createRelation',
      policies: []
    };

    newRoutes.routes['DELETE /' + scope.id + '/:parentId/:relation/:id'] = {
      controller: scope.globalID,
      action: 'destroyRelation',
      policies: []
    };
  }

  return newRoutes;
};
