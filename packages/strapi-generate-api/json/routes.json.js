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

module.exports = scope => {
  const newRoutes = {
    routes: {}
  };

  newRoutes.routes['GET /' + scope.humanizeId] = {
    controller: scope.globalID,
    action: 'find',
    policies: []
  };

  newRoutes.routes['GET /' + scope.humanizeId + '/:id'] = {
    controller: scope.globalID,
    action: 'findOne',
    policies: []
  };

  newRoutes.routes['POST /' + scope.humanizeId] = {
    controller: scope.globalID,
    action: 'create',
    policies: []
  };

  newRoutes.routes['PUT /' + scope.humanizeId + '/:id'] = {
    controller: scope.globalID,
    action: 'update',
    policies: []
  };

  newRoutes.routes['DELETE /' + scope.humanizeId + '/:id'] = {
    controller: scope.globalID,
    action: 'destroy',
    policies: []
  };

  if (scope.template && scope.template !== 'mongoose') {
    newRoutes.routes['POST /' + scope.humanizeId + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'createRelation',
      policies: []
    };

    newRoutes.routes['DELETE /' + scope.humanizeId + '/:id/relationships/:relation'] = {
      controller: scope.globalID,
      action: 'destroyRelation',
      policies: []
    };
  }

  return newRoutes;
};
