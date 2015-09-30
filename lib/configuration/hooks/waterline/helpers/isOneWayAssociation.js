'use strict';

/**
 * Module dependencies
 */

// Locale helpers.
const isOneToManyAssociation = require('./isOneToManyAssociation');
const isOneToOneAssociation = require('./isOneToOneAssociation');

/**
 * Helper which returns a boolean. True if the type
 * of the relation is `oneToOne`.
 *
 * @param {Object} currentModel
 * @param {Object} association
 *
 * @return {boolean}
 */

module.exports = function isOneWayAssociation(currentModel, association) {
  return !(isOneToManyAssociation(currentModel, association) || isOneToOneAssociation(currentModel, association));
};
