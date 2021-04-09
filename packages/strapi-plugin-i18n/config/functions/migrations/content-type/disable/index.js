'use strict';

const { getDefaultLocale } = require('../utils');
const { getService } = require('../../../../../utils');

const migrateForBookshelf = require('./migrate-for-bookshelf');
const migrateForMongoose = require('./migrate-for-mongoose');

const after = () => {};

// Disable i18n on CT -> Delete all entities that are not in the default locale
const before = async ({ model, definition, previousDefinition, ORM }, context) => {
  const { isLocalizedContentType } = getService('content-types');

  if (isLocalizedContentType(definition) || !isLocalizedContentType(previousDefinition)) {
    return;
  }

  const defaultLocale = await getDefaultLocale(model, ORM);

  if (model.orm === 'bookshelf') {
    await migrateForBookshelf(
      { ORM, defaultLocale, definition, previousDefinition, model },
      context
    );
  } else if (model.orm === 'mongoose') {
    await migrateForMongoose({ ORM, defaultLocale, model });
  }
};

module.exports = {
  before,
  after,
};
