'use strict';

const { difference, pick, orderBy, prop, intersection } = require('lodash/fp');
const { getService } = require('../../../utils');

const BATCH_SIZE = 1000;

const shouldBeProceed = processedLocaleCodes => entry =>
  entry.localizations.length > 1 &&
  intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length === 0;

const migrateForBookshelf = async ({ ORM, model, attributesToMigrate, locales }) => {
  // Create tmp table with all updates to make (faster than make updates one by one)
  const TMP_TABLE_NAME = '__tmp__i18n_field_migration';
  const columnsToCopy = ['id', ...attributesToMigrate];
  await ORM.knex.schema.dropTableIfExists(TMP_TABLE_NAME);
  await ORM.knex.raw(`CREATE TABLE ?? AS ??`, [
    TMP_TABLE_NAME,
    ORM.knex
      .select(columnsToCopy)
      .from(model.collectionName)
      .whereRaw('?', 0),
  ]);

  // Transaction is started after DDL because of MySQL (https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html)
  const trx = await ORM.knex.transaction();

  // bulk insert updates in tmp table
  try {
    const processedLocaleCodes = [];
    for (const locale of locales) {
      const batchSize = BATCH_SIZE;
      let offset = 0;
      let batchCount = BATCH_SIZE;
      while (batchCount === batchSize) {
        const batch = await trx
          .select([...attributesToMigrate, 'locale', 'localizations'])
          .from(model.collectionName)
          .where('locale', locale.code)
          .orderBy('id')
          .offset(offset)
          .limit(batchSize);

        // postgres automatically parses JSON, but not slite nor mysql
        batch.forEach(entry => {
          if (typeof entry.localizations === 'string') {
            entry.localizations = JSON.parse(entry.localizations);
          }
        });

        batchCount = batch.length;
        const entriesToProcess = batch.filter(shouldBeProceed(processedLocaleCodes));

        const tempEntries = entriesToProcess.reduce((entries, entry) => {
          const attributesValues = pick(attributesToMigrate, entry);
          const entriesIdsToUpdate = entry.localizations
            .filter(related => related.locale !== locale.code)
            .map(prop('id'));

          return entries.concat(entriesIdsToUpdate.map(id => ({ id, ...attributesValues })));
        }, []);

        console.log('tempEntries', tempEntries);

        await trx.batchInsert(TMP_TABLE_NAME, tempEntries, 100);

        offset += batchSize;
      }
      processedLocaleCodes.push(locale.code);
    }

    const getSubquery = cl =>
      trx
        .select(cl)
        .from(TMP_TABLE_NAME)
        .where(`${TMP_TABLE_NAME}.id`, trx.raw('??', [`${model.collectionName}.id`]));
    const updates = attributesToMigrate.reduce(
      (updates, cl) => ({ ...updates, [cl]: getSubquery(cl) }),
      {}
    );
    await trx
      .from(model.collectionName)
      .update(updates)
      .whereIn('id', qb => qb.select(['id']).from(TMP_TABLE_NAME));

    // Transaction is ended before DDL
    await trx.commit();

    await ORM.knex.schema.dropTableIfExists(TMP_TABLE_NAME);
  } catch (e) {
    await trx.rollback();
    throw e;
  }
};

const migrateForMongoose = async ({ model, attributesToMigrate, locales }) => {
  const processedLocaleCodes = [];
  for (const locale of locales) {
    const batchSize = BATCH_SIZE;
    let batchCount = BATCH_SIZE;
    let lastId;
    while (batchCount === batchSize) {
      const findParams = { locale: locale.code };
      if (lastId) {
        findParams._id = { $gt: lastId };
      }

      const batch = await model
        .find(findParams, [...attributesToMigrate, 'locale', 'localizations'])
        .sort({ _id: 1 })
        .limit(batchSize);

      if (batch.length > 0) {
        lastId = batch[batch.length - 1]._id;
      }
      batchCount = batch.length;

      const entriesToProcess = batch.filter(shouldBeProceed);

      const updates = entriesToProcess.reduce((entries, entry) => {
        const attributesValues = pick(attributesToMigrate, entry);
        const entriesIdsToUpdate = entry.localizations
          .filter(related => related.locale !== locale.code)
          .map(prop('id'));

        return entries.concat({
          updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
        });
      }, []);

      await model.bulkWrite(updates);
    }
    processedLocaleCodes.push(locale.code);
  }
};

// Migration when i18n is disabled on a field of a content-type that have i18n enabled
const after = async ({ model, definition, previousDefinition, ORM }) => {
  const ctService = getService('content-types');
  const localeService = getService('locales');

  if (!ctService.isLocalized(model)) {
    return;
  }

  const localizedAttributes = ctService.getLocalizedAttributes(definition);
  const prevLocalizedAttributes = ctService.getLocalizedAttributes(previousDefinition);
  const attributesDisabled = difference(prevLocalizedAttributes, localizedAttributes);
  const attributesToMigrate = intersection(Object.keys(definition.attributes), attributesDisabled);

  if (attributesToMigrate.length === 0) {
    return;
  }

  let locales = await localeService.find();
  locales = await localeService.setIsDefault(locales);
  locales = orderBy(['isDefault', 'code'], ['desc', 'asc'])(locales); // Put default locale first

  if (model.orm === 'bookshelf') {
    await migrateForBookshelf({ ORM, model, attributesToMigrate, locales });
  } else if (model.orm === 'mongoose') {
    await migrateForMongoose({ model, attributesToMigrate, locales });
  }
};

const before = () => {};

module.exports = {
  before,
  after,
};
