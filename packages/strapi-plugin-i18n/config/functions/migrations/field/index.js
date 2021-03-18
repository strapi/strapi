'use strict';

const { difference, intersection } = require('lodash/fp');
const { getService } = require('../../../../utils');
const migrateForMongoose = require('./migrate-for-mongoose');
const migrateForBookshelf = require('./migrate-for-bookshelf');

// Migration when i18n is disabled on a field of a content-type that have i18n enabled
const after = async ({ model, definition, previousDefinition, ORM }) => {
  const ctService = getService('content-types');

  if (!ctService.isLocalized(model) || !previousDefinition) {
    return;
  }

  const localizedAttributes = ctService.getLocalizedAttributes(definition);
  const prevLocalizedAttributes = ctService.getLocalizedAttributes(previousDefinition);
  const attributesDisabled = difference(prevLocalizedAttributes, localizedAttributes);
  const attributesToMigrate = intersection(Object.keys(definition.attributes), attributesDisabled);

  if (attributesToMigrate.length === 0) {
    return;
  }

  if (model.orm === 'bookshelf') {
    await migrateForBookshelf({ ORM, model, attributesToMigrate });
  } else if (model.orm === 'mongoose') {
    await migrateForMongoose({ model, attributesToMigrate });
  }
};

const before = () => {};

module.exports = {
  before,
  after,
};
