'use strict';

const { shouldBeProcesseed, getUpdatesInfo } = require('./utils');

const BATCH_SIZE = 1000;

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

module.exports = migrateForBookshelf;
