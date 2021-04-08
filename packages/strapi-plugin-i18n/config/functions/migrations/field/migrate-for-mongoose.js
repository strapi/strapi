'use strict';

const { migrate } = require('./migrate');
const { areScalarAttrsOnly } = require('./utils');

const batchUpdate = async ({ updatesInfo, model }) => {
  const updates = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) => ({
    updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
  }));

  await model.bulkWrite(updates);
};

const migrateForMongoose = async ({ model, attrsToMigrate }) => {
  const onlyScalarAttrs = areScalarAttrsOnly({ model, attributes: attrsToMigrate });

  if (onlyScalarAttrs) {
    await migrate({ model, attrsToMigrate }, { migrateFn: batchUpdate });
  } else {
    await migrate({ model, attrsToMigrate });
  }
};

module.exports = migrateForMongoose;
