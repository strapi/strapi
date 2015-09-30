'use strict';

/**
 * Module dependencies
 */

// Locale helpers.
const isManyToOneAssociation = require('./isManyToOneAssociation');
const isOneToOneAssociation = require('./isOneToOneAssociation');
const isOneWayAssociation = require('./isOneWayAssociation');
const isOneToManyAssociation = require('./isOneToManyAssociation');
const isManyToManyAssociation = require('./isManyToManyAssociation');

/**
 * Helper which returns the association type of the attribute
 *
 * @param {Object} currentModel
 * @param {Object} association
 *
 * @return {boolean}
 */

module.exports = {
  getAssociationType: function (currentModel, association) {
    let associationType;

    if (association.type === 'model') {
      if (isManyToOneAssociation(currentModel, association)) {
        associationType = 'manyToOne';
      } else if (isOneToOneAssociation(currentModel, association)) {
        associationType = 'oneToOne';
      } else if (isOneWayAssociation(currentModel, association)) {
        associationType = 'oneWay';
      } else {
        associationType = 'unknown';
      }
    } else if (association.type === 'collection') {
      if (isOneToManyAssociation(currentModel, association)) {
        associationType = 'oneToMany';
      } else if (isManyToManyAssociation(currentModel, association)) {
        associationType = 'manyToMany';
      } else {
        associationType = 'unknown';
      }
    }

    return associationType;
  }
};
