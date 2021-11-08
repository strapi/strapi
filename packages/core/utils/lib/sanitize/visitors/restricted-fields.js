'use strict';

const { isArray } = require('lodash/fp');

module.exports = (restrictedFields = null) => ({ key, path }, { remove }) => {
  // Remove all fields
  if (restrictedFields === null) {
    remove(key);
    return;
  }

  // Ignore invalid formats
  if (!isArray(restrictedFields)) {
    return;
  }

  // Remove if an exact match was found
  if (restrictedFields.includes(path)) {
    remove(key);
    return;
  }

  // Remove nested matches
  const isRestrictedNested = restrictedFields.some(allowedPath =>
    path.startsWith(`${allowedPath}.`)
  );
  if (isRestrictedNested) {
    remove(key);
    return;
  }
};
