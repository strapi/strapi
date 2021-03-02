'use strict';

const { pick, prop, intersection } = require('lodash/fp');

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

module.exports = {
  shouldBeProcesseed,
  getUpdatesInfo,
};
