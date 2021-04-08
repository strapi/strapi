'use strict';

const { pick, prop } = require('lodash/fp');
const { getService } = require('../../../../utils');
const { shouldBeProcessed, getUpdatesInfo, getSortedLocales } = require('./utils');

const BATCH_SIZE = 1000;

const migrateBatch = async (entries, { model, attrsToMigrate }, { transacting }) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const updatePromises = entries.map(entity => {
    const updateValues = pick(attrsToMigrate, copyNonLocalizedAttributes(model, entity));
    const entriesIdsToUpdate = entity.localizations.map(prop('id'));
    console.log('updateValues', JSON.stringify(updateValues, null, 2));
    return Promise.all(
      entriesIdsToUpdate.map(id =>
        strapi.query(model.uid).update({ id }, updateValues, { transacting })
      )
    );
  });

  await Promise.all(updatePromises);
};

const migrate = async ({ model, attrsToMigrate }, { migrateFn, transacting } = {}) => {
  const locales = await getSortedLocales({ transacting });
  const processedLocaleCodes = [];
  for (const locale of locales) {
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { results } = await strapi
        .query(model.uid)
        .findPage({ locale, page, pageSize: BATCH_SIZE }, { transacting });
      const entriesToProcess = results.filter(shouldBeProcessed(processedLocaleCodes));

      if (migrateFn) {
        const updatesInfo = getUpdatesInfo({ entriesToProcess, attrsToMigrate });
        await migrateFn({ updatesInfo, model }, { transacting });
      } else {
        await migrateBatch(entriesToProcess, { model, attrsToMigrate }, { transacting });
      }

      if (results.length < BATCH_SIZE) {
        break;
      }
      page += 1;
    }
    processedLocaleCodes.push(locale);
  }
};

module.exports = {
  migrate,
};
