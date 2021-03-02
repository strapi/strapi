'use strict';

const { difference, orderBy, intersection } = require('lodash/fp');
const { getService } = require('../../../../utils');
const migrateForMongoose = require('./migrateForMongoose');
const migrateForBookshelf = require('./migrateForBookshelf');

// Migration when i18n is disabled on a field of a content-type that have i18n enabled
const after = async ({ model, definition, previousDefinition, ORM }) => {
  const ctService = getService('content-types');
  const localeService = getService('locales');

  if (!ctService.isLocalized(model)) {
    return;
  }

  const localizedAttributes = ctService.getLocalizedFields(definition);
  const prevLocalizedAttributes = ctService.getLocalizedFields(previousDefinition);
  const attributesDisabled = difference(prevLocalizedAttributes, localizedAttributes);
  const attributesToMigrate = intersection(Object.keys(definition.attributes), attributesDisabled);

  if (attributesToMigrate.length === 0) {
    return;
  }

  let locales = await localeService.find();
  locales = await localeService.setIsDefault(locales);
  locales = orderBy(['isDefault', 'code'], ['desc', 'asc'])(locales); // Put default locale first

  if (model.orm === 'bookshelf') {
    await migrateForBookshelf({ ORM, model, attributesToMigrate, locales });
  } else if (model.orm === 'mongoose') {
    await migrateForMongoose({ model, attributesToMigrate, locales });
  }
};

const before = () => {};

module.exports = {
  before,
  after,
};
