'use strict';

const { difference, pick, orderBy, prop, intersection } = require('lodash/fp');
const { getService } = require('../../../utils');

const getSubstitute = arr => arr.map(() => '??').join(', ');

const before = () => {};

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

  const processedLocaleCodes = [];

  if (model.orm === 'bookshelf') {
    const trx = await ORM.knex.transaction();
    try {
      const columnsToCopy = ['id', ...attributesToMigrate];

      await trx.raw('DROP TABLE IF EXISTS __tmp__i18n_field_migration');
      await trx.raw(
        `CREATE TABLE __tmp__i18n_field_migration AS SELECT ${getSubstitute(
          columnsToCopy
        )} FROM ?? WHERE 0`,
        [...columnsToCopy, model.collectionName]
      );

      for (const locale of locales) {
        const batchSize = 1000;
        let offset = 0;
        let batchCount = 1000;
        while (batchCount === batchSize) {
          const batch = await trx
            .select([...attributesToMigrate, 'locale', 'localizations'])
            .from(model.collectionName)
            .where('locale', locale.code)
            .orderBy('id')
            .offset(offset)
            .limit(batchSize);
          batch.forEach(entry => (entry.localizations = JSON.parse(entry.localizations)));

          batchCount = batch.length;
          const entriesToProcess = batch.filter(
            entry =>
              entry.localizations.length > 1 &&
              intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length ===
                0
          );

          const tempEntries = entriesToProcess.reduce((entries, entry) => {
            const attributesValues = pick(attributesToMigrate, entry);
            const entriesIdsToUpdate = entry.localizations
              .filter(related => related.locale !== locale.code)
              .map(prop('id'));

            return entries.concat(entriesIdsToUpdate.map(id => ({ id, ...attributesValues })));
          }, []);

          await trx.batchInsert('__tmp__i18n_field_migration', tempEntries, 100);

          offset += batchSize;
        }
        processedLocaleCodes.push(locale.code);
      }

      const attributesToMigrateSub = getSubstitute(attributesToMigrate);
      await trx.raw(
        `UPDATE ?? SET (${attributesToMigrateSub}) = (SELECT ${attributesToMigrateSub} FROM __tmp__i18n_field_migration as tmp WHERE tmp.id = ??.id) WHERE id IN(SELECT id from __tmp__i18n_field_migration)`,
        [model.collectionName, ...attributesToMigrate, ...attributesToMigrate, model.collectionName]
      );
      await trx.raw('DROP TABLE __tmp__i18n_field_migration');
      trx.commit();
    } catch (e) {
      trx.rollback();
      throw e;
    }
  } else if (model.orm === 'mongoose') {
    for (const locale of locales) {
      const batchSize = 1000;
      let batchCount = 1000;
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

        const entriesToProcess = batch.filter(
          entry =>
            entry.localizations.length > 1 &&
            intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length === 0
        );

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
  }
};

module.exports = {
  before,
  after,
};
