'use strict';

const { difference, pick, orderBy, prop, intersection } = require('lodash/fp');
const { getService } = require('../../../utils');

const BATCH_SIZE = 1000;

const shouldBeProcesseed = processedLocaleCodes => entry => {
  return (
    entry.localizations.length > 1 &&
    intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length === 0
  );
};

const getUpdates = ({ entriesToProcess, formatUpdate, locale, attributesToMigrate }) => {
  return entriesToProcess.reduce((updates, entry) => {
    const attributesValues = pick(attributesToMigrate, entry);
    const entriesIdsToUpdate = entry.localizations
      .filter(related => related.locale !== locale.code)
      .map(prop('id'));

    return updates.concat(formatUpdate(entriesIdsToUpdate, attributesValues));
  }, []);
};

const formatMongooseUpdate = (entriesIdsToUpdate, attributesValues) => ({
  updateMany: { filter: { _id: { $in: entriesIdsToUpdate } }, update: attributesValues },
});

const formatBookshelfUpdate = (entriesIdsToUpdate, attributesValues) =>
  entriesIdsToUpdate.map(id => ({ id, ...attributesValues }));

const migrateForBookshelf = async ({ ORM, model, attributesToMigrate, locales }) => {
  // Create tmp table with all updates to make (faster than making updates one by one)
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

  try {
    const processedLocaleCodes = [];
    for (const locale of locales) {
      let offset = 0;
      let batchCount = BATCH_SIZE;
      while (batchCount === BATCH_SIZE) {
        const batch = await trx
          .select([...attributesToMigrate, 'locale', 'localizations'])
          .from(model.collectionName)
          .where('locale', locale.code)
          .orderBy('id')
          .offset(offset)
          .limit(BATCH_SIZE);

        // postgres automatically parses JSON, but not sqlite nor mysql
        batch.forEach(entry => {
          if (typeof entry.localizations === 'string') {
            entry.localizations = JSON.parse(entry.localizations);
          }
        });

        batchCount = batch.length;
        const entriesToProcess = batch.filter(shouldBeProcesseed(processedLocaleCodes));

        const tmpEntries = getUpdates({
          entriesToProcess,
          formatUpdate: formatBookshelfUpdate,
          locale,
          attributesToMigrate,
        });

        await trx.batchInsert(TMP_TABLE_NAME, tmpEntries, 100);

        offset += BATCH_SIZE;
      }
      processedLocaleCodes.push(locale.code);
    }

    const getSubquery = columnName =>
      trx
        .select(columnName)
        .from(TMP_TABLE_NAME)
        .where(`${TMP_TABLE_NAME}.id`, trx.raw('??', [`${model.collectionName}.id`]));

    const updates = attributesToMigrate.reduce(
      (updates, columnName) => ({ ...updates, [columnName]: getSubquery(columnName) }),
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

      const updates = getUpdates({
        entriesToProcess,
        formatUpdate: formatMongooseUpdate,
        locale,
        attributesToMigrate,
      });

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
