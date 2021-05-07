'use strict';

const pmap = require('p-map');

const BATCH_SIZE = 1000;

const migrateForMongoose = async ({ model, defaultLocale }) => {
  let lastId;
  const findParams = { locale: { $ne: defaultLocale } };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (lastId) {
      findParams._id = { $gt: lastId };
    }

    const batch = await model
      .find(findParams, ['id'])
      .sort({ _id: 1 })
      .limit(BATCH_SIZE);

    if (batch.length > 0) {
      lastId = batch[batch.length - 1]._id;
    }

    await pmap(batch, entry => model.deleteRelations(entry), {
      concurrency: 100,
      stopOnError: true,
    });

    if (batch.length < BATCH_SIZE) {
      break;
    }
  }
  await model.deleteMany({ locale: { $ne: defaultLocale } });
  await model.updateMany({}, { $unset: { locale: '' } }, { strict: false });
};

module.exports = migrateForMongoose;
