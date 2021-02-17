'use strict';

const { pick, isNil } = require('lodash/fp');

const { getService } = require('../utils');
const { getNonLocalizedFields } = require('./content-types');

/**
 * Adds the default locale to an object if it isn't defined set yet
 * @param {Object} data a data object before being persisted into db
 */
const assignDefaultLocale = async data => {
  if (isNil(data.locale)) {
    data.locale = await getService('locales').getDefaultLocale();
  }
};

/**
 * Create default localizations for an entry if it isn't defined yet
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const addLocalizations = async (entry, { model }) => {
  if (isNil(entry.localizations)) {
    const localizations = [{ locale: entry.locale, id: entry.id }];
    await strapi.query(model.uid).update({ id: entry.id }, { localizations });

    Object.assign(entry, { localizations });
  }
};

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const updateNonLocalizedFields = async (entry, { model }) => {
  if (Array.isArray(entry.localizations)) {
    const fieldsToUpdate = pick(getNonLocalizedFields(model), entry);

    const updateQueries = entry.localizations
      .filter(({ id }) => id != entry.id)
      .map(({ id }) => strapi.query(model.uid).update({ id }, fieldsToUpdate));

    await Promise.all(updateQueries);
  }
};

/**
 * Remove entry from localizations & udpate realted localizations
 * This method should be used only after an entry is deleted
 * @param {Object} entry entry to remove from localizations
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const removeEntryFromRelatedLocalizations = async (entry, { model }) => {
  if (Array.isArray(entry.localizations)) {
    const newLocalizations = entry.localizations.filter(({ id }) => id != entry.id);

    const updateQueries = newLocalizations.map(({ id }) => {
      return strapi.query(model.uid).update({ id }, { localizations: newLocalizations });
    });

    await Promise.all(updateQueries);
  }
};

module.exports = {
  assignDefaultLocale,
  addLocalizations,
  updateNonLocalizedFields,
  removeEntryFromRelatedLocalizations,
};
