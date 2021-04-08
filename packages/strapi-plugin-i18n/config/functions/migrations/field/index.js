'use strict';

const { difference, keys, intersection, isEmpty } = require('lodash/fp');
const { getService } = require('../../../../utils');
const migrateForMongoose = require('./migrate-for-mongoose');
const migrateForBookshelf = require('./migrate-for-bookshelf');

// Migration when i18n is disabled on a field of a content-type that have i18n enabled
const after = async ({ model, definition, previousDefinition, ORM }) => {
  const ctService = getService('content-types');

  if (!ctService.isLocalized(model) || !ctService.isLocalized(previousDefinition)) {
    return;
  }

  const localizedAttributes = ctService.getLocalizedAttributes(definition);
  const prevLocalizedAttributes = ctService.getLocalizedAttributes(previousDefinition);
  const attributesDisabled = difference(prevLocalizedAttributes, localizedAttributes);
  const attrsToMigrate = intersection(keys(definition.attributes), attributesDisabled);

  if (isEmpty(attrsToMigrate)) {
    return;
  }

  if (model.orm === 'bookshelf') {
    await migrateForBookshelf({ ORM, model, attrsToMigrate });
  } else if (model.orm === 'mongoose') {
    await migrateForMongoose({ model, attrsToMigrate });
  }
};

const before = () => {};

module.exports = {
  before,
  after,
};
