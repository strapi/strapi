'use strict';

const { pick, prop, intersection } = require('lodash/fp');

const shouldBeProcessed = processedLocaleCodes => entry => {
  return (
    entry.localizations.length > 0 &&
    intersection(entry.localizations.map(prop('locale')), processedLocaleCodes).length === 0
  );
};

const getUpdatesInfo = ({ entriesToProcess, attributesToMigrate }) => {
  const updates = [];
  for (const entry of entriesToProcess) {
    const attributesValues = pick(attributesToMigrate, entry);
    const entriesIdsToUpdate = entry.localizations.map(prop('id'));
    updates.push({ entriesIdsToUpdate, attributesValues });
  }
  return updates;
};

module.exports = {
  shouldBeProcessed,
  getUpdatesInfo,
};
