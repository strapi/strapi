'use strict';

const { pick, isNil } = require('lodash/fp');

const { getService } = require('../utils');
const { getNonLocalizedFields } = require('./content-types');

/**
 * Adds the default locale to an object if it isn't defined yet
 * @param {Object} data a data object before being persisted into db
 */
const assignDefaultLocale = async data => {
  if (isNil(data.locale)) {
    data.locale = await getService('locales').getDefaultLocale();
  }
};

/**
 * Syncronize related localizations from a root one
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const syncLocalizations = async (entry, { model }) => {
  if (Array.isArray(entry.localizations)) {
    const newLocalizations = entry.localizations.concat({ id: entry.id });
    const updateLocalization = id => {
      const localizations = newLocalizations
        .filter(localization => localization.id != id)
        .map(({ id }) => id);

      return strapi.query(model.uid).update({ id }, { localizations });
    };

    await Promise.all(entry.localizations.map(({ id }) => updateLocalization(id)));
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
    const nonLocalizedFields = getNonLocalizedFields(model);

    if (nonLocalizedFields.length === 0) {
      return;
    }

    const fieldsToUpdate = pick(nonLocalizedFields, entry);
    const updateLocalization = id => strapi.query(model.uid).update({ id }, fieldsToUpdate);

    await Promise.all(entry.localizations.map(({ id }) => updateLocalization(id)));
  }
};

module.exports = {
  assignDefaultLocale,
  syncLocalizations,
  updateNonLocalizedFields,
};
