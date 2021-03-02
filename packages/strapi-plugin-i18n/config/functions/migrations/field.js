'use strict';

const { difference, pick, orderBy, prop, intersection } = require('lodash/fp');
const { getService } = require('../../../utils');

const BATCH_SIZE = 1000;

// Common functions

const shouldBeProcesseed = processedLocaleCodes => entry => {
  return (
    entry.localizations.length > 1 &&
    intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length === 0
  );
};

const getUpdatesInfo = ({ entriesToProcess, locale, attributesToMigrate }) => {
  const updates = [];
  for (const entry of entriesToProcess) {
    const attributesValues = pick(attributesToMigrate, entry);
    const entriesIdsToUpdate = entry.localizations
      .filter(related => related.locale !== locale.code)
      .map(prop('id'));
    updates.push({ entriesIdsToUpdate, attributesValues });
  }
  return updates;
};

// Bookshelf

const TMP_TABLE_NAME = '__tmp__i18n_field_migration';

const batchInsertInTmpTable = async (updatesInfo, trx) => {
  const tmpEntries = [];
  updatesInfo.forEach(({ entriesIdsToUpdate, attributesValues }) => {
    entriesIdsToUpdate.forEach(id => {
      tmpEntries.push({ id, ...attributesValues });
    });
  });
  await trx.batchInsert(TMP_TABLE_NAME, tmpEntries, 100);
};

const batchUpdate = async (updatesInfo, trx, model) => {
  const promises = updatesInfo.map(({ entriesIdsToUpdate, attributesValues }) =>
    trx
      .from(model.collectionName)
      .update(attributesValues)
      .whereIn('id', entriesIdsToUpdate)
  );
  await Promise.all(promises);
};

const updateFromTmpTable = async ({ model, trx, attributesToMigrate }) => {
  const collectionName = model.collectionName;
  let bindings = [];
  if (model.client === 'pg') {
    const substitutes = attributesToMigrate.map(() => '?? = ??.??').join(',');
    bindings.push(collectionName);
    attributesToMigrate.forEach(attr => bindings.push(attr, TMP_TABLE_NAME, attr));
    bindings.push(TMP_TABLE_NAME, collectionName, TMP_TABLE_NAME);

    await trx.raw(`UPDATE ?? SET ${substitutes} FROM ?? WHERE ??.id = ??.id;`, bindings);
  } else if (model.client === 'mysql') {
    const substitutes = attributesToMigrate.map(() => '??.?? = ??.??').join(',');
    bindings.push(collectionName, TMP_TABLE_NAME, collectionName, TMP_TABLE_NAME);
    attributesToMigrate.forEach(attr => bindings.push(collectionName, attr, TMP_TABLE_NAME, attr));

    await trx.raw(`UPDATE ?? JOIN ?? ON ??.id = ??.id SET ${substitutes};`, bindings);
  }
};

const createTmpTable = async ({ ORM, attributesToMigrate, model }) => {
  const columnsToCopy = ['id', ...attributesToMigrate];
  await ORM.knex.schema.dropTableIfExists(TMP_TABLE_NAME);
  await ORM.knex.raw(`CREATE TABLE ?? AS ??`, [
    TMP_TABLE_NAME,
    ORM.knex
      .select(columnsToCopy)
      .from(model.collectionName)
      .whereRaw('?', 0),
  ]);
};

const deleteTmpTable = ({ ORM }) => ORM.knex.schema.dropTableIfExists(TMP_TABLE_NAME);

const migrateForBookshelf = async ({ ORM, model, attributesToMigrate, locales }) => {
  // The migration is custom for pg and mysql for better perfomance
  const isPgOrMysql = ['pg', 'mysql'].includes(model.client);

  if (isPgOrMysql) {
    await createTmpTable({ ORM, attributesToMigrate, model });
  }

  const trx = await ORM.knex.transaction();
  try {
    const processedLocaleCodes = [];
    for (const locale of locales) {
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await trx
          .select([...attributesToMigrate, 'locale', 'localizations'])
          .from(model.collectionName)
          .where('locale', locale.code)
          .orderBy('id')
          .offset(offset)
          .limit(BATCH_SIZE);

        offset += BATCH_SIZE;

        // postgres automatically parses JSON, but not sqlite nor mysql
        batch.forEach(entry => {
          if (typeof entry.localizations === 'string') {
            entry.localizations = JSON.parse(entry.localizations);
          }
        });

        const entriesToProcess = batch.filter(shouldBeProcesseed(processedLocaleCodes));
        const updatesInfo = getUpdatesInfo({ entriesToProcess, locale, attributesToMigrate });

        if (isPgOrMysql) {
          await batchInsertInTmpTable(updatesInfo, trx);
        } else {
          await batchUpdate(updatesInfo, trx, model);
        }

        if (batch.length < BATCH_SIZE) {
          break;
        }
      }
      processedLocaleCodes.push(locale.code);
    }

    if (isPgOrMysql) {
      await updateFromTmpTable({ model, trx, attributesToMigrate });
    }

    await trx.commit();

    if (isPgOrMysql) {
      await deleteTmpTable({ ORM });
    }
  } catch (e) {
    await trx.rollback();
    throw e;
  }
};

// Mongoose

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
  throw new Error('Done');
};

const before = () => {};

module.exports = {
  before,
  after,
};
