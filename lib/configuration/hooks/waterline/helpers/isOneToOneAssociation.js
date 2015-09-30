'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Helper which returns a boolean. True if the type
 * of the relation is `oneToOne`.
 *
 * @param {Object} currentModel
 * @param {Object} association
 *
 * @return {boolean}
 */

module.exports = function isOneToOneAssociation(currentModel, association) {
  return _.findWhere(strapi.models[association.model] && strapi.models[association.model].associations, {
    model: currentModel
  });
};
