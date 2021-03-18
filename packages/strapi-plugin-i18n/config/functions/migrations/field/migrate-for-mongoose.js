'use strict';

const { orderBy } = require('lodash/fp');
const { shouldBeProcessed, getUpdatesInfo } = require('./utils');

const BATCH_SIZE = 1000;

const getSortedLocales = async () => {
  let defaultLocale;
  try {
    const defaultLocaleRow = await strapi.models['core_store'].findOne({
      key: 'plugin_i18n_default_locale',
    });
    defaultLocale = JSON.parse(defaultLocaleRow.value);
  } catch (e) {
    throw new Error("Could not migrate because the default locale doesn't exist");
  }

  let locales;
  try {
    strapi.models;
    locales = await strapi.plugins.i18n.models.locale.find();
  } catch (e) {
    throw new Error('Could not migrate because no locale exist');
  }

  locales.forEach(locale => (locale.isDefault = locale.code === defaultLocale));
  return orderBy(['isDefault', 'code'], ['desc', 'asc'])(locales); // Put default locale first
};

const migrateForMongoose = async ({ model, attributesToMigrate }) => {
  const locales = await getSortedLocales();
  const processedLocaleCodes = [];
  for (const locale of locales) {
    let lastId;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const findParams = { locale: locale.code };
      if (lastId) {
        findParams._id = { $gt: lastId };
      }

      const batch = await model
        .find(findParams, [...attributesToMigrate, 'locale', 'localizations'])
        .populate('localizations', 'locale id')
        .sort({ _id: 1 })
        .limit(BATCH_SIZE);

      if (batch.length > 0) {
        lastId = batch[batch.length - 1]._id;
      }
      const entriesToProcess = batch.filter(shouldBeProcessed(processedLocaleCodes));

      const updatesInfo = getUpdatesInfo({ entriesToProcess, attributesToMigrate });
      const updates = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) => ({
        updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
      }));

      await model.bulkWrite(updates);

      if (batch.length < BATCH_SIZE) {
        break;
      }
    }
    processedLocaleCodes.push(locale.code);
  }
};

module.exports = migrateForMongoose;
