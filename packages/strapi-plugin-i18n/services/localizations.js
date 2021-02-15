'use strict';

const { pick, isNil } = require('lodash/fp');
const { getNonLocalizedFields } = require('./content-types');

const addLocalizations = async (entry, { model }) => {
  if (isNil(entry.localizations)) {
    const localizations = [{ locale: entry.locale, id: entry.id }];
    await strapi.query(model.uid).update({ id: entry.id }, { localizations });

    Object.assign(entry, { localizations });
  }
};

const updateNonLocalizedFields = async (entry, { model }) => {
  const fieldsToUpdate = pick(getNonLocalizedFields(model), entry);

  if (Array.isArray(entry.localizations)) {
    const updateQUeries = entry.localizations
      .filter(({ id }) => id != entry.id)
      .map(({ id }) => strapi.query(model.uid).update({ id }, fieldsToUpdate));

    await Promise.all(updateQUeries);
  }
};

module.exports = {
  addLocalizations,
  updateNonLocalizedFields,
  getNonLocalizedFields,
};
