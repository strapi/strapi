'use strict';

const { getService } = require('../../../../../utils');
const { getDefaultLocale } = require('../utils');

const updateLocale = (model, ORM, locale) => {
  if (model.orm === 'bookshelf') {
    return ORM.knex
      .update({ locale })
      .from(model.collectionName)
      .where({ locale: null });
  }

  if (model.orm === 'mongoose') {
    return model.updateMany(
      { $or: [{ locale: { $exists: false } }, { locale: null }] },
      { locale }
    );
  }
};

// Enable i18n on CT -> Add default locale to all existing entities
const after = async ({ model, definition, previousDefinition, ORM }) => {
  const { isLocalizedContentType } = getService('content-types');

  if (!isLocalizedContentType(definition) || isLocalizedContentType(previousDefinition)) {
    return;
  }

  const defaultLocale = await getDefaultLocale(model, ORM);

  await updateLocale(model, ORM, defaultLocale);
};

const before = () => {};

module.exports = {
  before,
  after,
};
