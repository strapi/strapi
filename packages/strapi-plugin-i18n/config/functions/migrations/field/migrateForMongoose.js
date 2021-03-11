'use strict';

const { shouldBeProcessed, getUpdatesInfo } = require('./utils');

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
        .populate('localizations', 'locale id')
        .sort({ _id: 1 })
        .limit(BATCH_SIZE);

      if (batch.length > 0) {
        lastId = batch[batch.length - 1]._id;
      }
      batchCount = batch.length;

      const entriesToProcess = batch.filter(shouldBeProcessed(processedLocaleCodes));

      const updatesInfo = getUpdatesInfo({ entriesToProcess, attributesToMigrate });
      const updates = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) => ({
        updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
      }));

      await model.bulkWrite(updates);
    }
    processedLocaleCodes.push(locale.code);
  }
};

module.exports = migrateForMongoose;
