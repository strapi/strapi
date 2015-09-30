'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Helper which returns a boolean. True if the type
 * of the relation is `oneToMany`.
 *
 * @param {Object} currentModel
 * @param {Object} association
 *
 * @return {boolean}
 */

module.exports = function isOneToManyAssociation(currentModel, association) {
  return _.findWhere(strapi.models[association.collection] && strapi.models[association.collection].associations, {
    model: currentModel
  });
};
