'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Helper which returns a boolean. True if the type
 * of the relation is `manyToOne`.
 *
 * @param {Object} currentModel
 * @param {Object} association
 *
 * @return {boolean}
 */

module.exports = function isManyToOneAssociation(currentModel, association) {
  return _.findWhere(strapi.models[association.model] && strapi.models[association.model].associations, {
    collection: currentModel
  });
};
