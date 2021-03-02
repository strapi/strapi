'use strict';

const { shouldBeProcesseed, getUpdatesInfo } = require('./utils');

const BATCH_SIZE = 1000;

const migrateForMongoose = async ({ model, attributesToMigrate, locales }) => {
  const processedLocaleCodes = [];
  for (const locale of locales) {
    let batchCount = BATCH_SIZE;
    let lastId;
    while (batchCount === BATCH_SIZE) {
      const findParams = { locale: locale.code };
      if (lastId) {
        findParams._id = { $gt: lastId };
      }

      const batch = await model
        .find(findParams, [...attributesToMigrate, 'locale', 'localizations'])
        .sort({ _id: 1 })
        .limit(BATCH_SIZE);

      if (batch.length > 0) {
        lastId = batch[batch.length - 1]._id;
      }
      batchCount = batch.length;

      const entriesToProcess = batch.filter(shouldBeProcesseed);

      const updatesInfo = getUpdatesInfo({ entriesToProcess, locale, attributesToMigrate });
      const updates = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) => ({
        updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
      }));

      await model.bulkWrite(updates);
    }
    processedLocaleCodes.push(locale.code);
  }
};

module.exports = migrateForMongoose;
