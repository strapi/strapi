'use strict';

const { singular } = require('pluralize');
const { has, omit, pick } = require('lodash/fp');
const { shouldBeProcessed, getUpdatesInfo } = require('./utils');

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
  if (model.client === 'pg') {
    const substitutes = attributesToMigrate.map(() => '?? = ??.??').join(',');
    const bindings = [collectionName];
    attributesToMigrate.forEach(attr => bindings.push(attr, TMP_TABLE_NAME, attr));
    bindings.push(TMP_TABLE_NAME, collectionName, TMP_TABLE_NAME);

    await trx.raw(`UPDATE ?? SET ${substitutes} FROM ?? WHERE ??.id = ??.id;`, bindings);
  } else if (model.client === 'mysql') {
    const substitutes = attributesToMigrate.map(() => '??.?? = ??.??').join(',');
    const bindings = [collectionName, TMP_TABLE_NAME, collectionName, TMP_TABLE_NAME];
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
  const localizationAssoc = model.associations.find(a => a.alias === 'localizations');
  const localizationTableName = localizationAssoc.tableCollectionName;

  // The migration is custom for pg and mysql for better perfomance
  const isPgOrMysql = ['pg', 'mysql'].includes(model.client);

  if (isPgOrMysql) {
    await createTmpTable({ ORM, attributesToMigrate, model });
  }

  const trx = await ORM.knex.transaction();

  const locsAttr = model.attributes.localizations;
  const foreignKey = `${singular(model.collectionName)}_${model.primaryKey}`;
  const relatedKey = `${locsAttr.attribute}_${locsAttr.column}`;
  try {
    const processedLocaleCodes = [];
    for (const locale of locales) {
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let batch = await trx
          .select([
            ...attributesToMigrate.map(attr => `model.${attr}`),
            'model.id as __strapi_rootId',
            'relModel.id as id',
            'relModel.locale',
          ])
          .join(
            `${localizationTableName} as loc`,
            `model.${model.primaryKey}`,
            '=',
            `loc.${foreignKey}`
          )
          .join(
            `${model.collectionName} as relModel`,
            `loc.${relatedKey}`,
            '=',
            `relModel.${model.primaryKey}`
          )
          .from(
            trx
              .select('*')
              .from(`${model.collectionName} as subModel`)
              .orderBy(`subModel.${model.primaryKey}`)
              .where(`subModel.locale`, locale.code)
              .offset(offset)
              .limit(BATCH_SIZE)
              .as('model')
          );
        let entries = batch.reduce((entries, entry) => {
          if (has(entry.__strapi_rootId, entries)) {
            entries[entry.__strapi_rootId].localizations.push(pick(['id', 'locale'], entry));
          } else {
            entries[entry.__strapi_rootId] = omit(['id', 'locale', '__strapi_rootId'], entry);
            entries[entry.__strapi_rootId].localizations = [pick(['id', 'locale'], entry)];
          }

          return entries;
        }, {});
        entries = Object.values(entries);

        offset += BATCH_SIZE;

        const entriesToProcess = batch.filter(shouldBeProcessed(processedLocaleCodes));
        const updatesInfo = getUpdatesInfo({ entriesToProcess, attributesToMigrate });

        if (isPgOrMysql) {
          await batchInsertInTmpTable(updatesInfo, trx);
        } else {
          await batchUpdate(updatesInfo, trx, model);
        }

        if (entries.length < BATCH_SIZE) {
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
