'use strict';

const { migrate } = require('./migrate');
const { areScalarAttributesOnly } = require('./utils');

const batchUpdate = async ({ updatesInfo, model }) => {
  const updates = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) => ({
    updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
  }));

  await model.bulkWrite(updates);
};

const migrateForMongoose = async ({ model, attributesToMigrate }) => {
  const onlyScalarAttrs = areScalarAttributesOnly({ model, attributes: attributesToMigrate });

  if (onlyScalarAttrs) {
    await migrate({ model, attributesToMigrate }, { migrateFn: batchUpdate });
  } else {
    await migrate({ model, attributesToMigrate });
  }
};

module.exports = migrateForMongoose;
