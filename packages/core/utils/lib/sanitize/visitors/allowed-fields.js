'use strict';

const { isArray } = require('lodash/fp');

module.exports = (allowedFields = null) => ({ key, path }, { remove }) => {
  // All fields are allowed
  if (allowedFields === null) {
    return;
  }

  // Ignore invalid formats
  if (!isArray(allowedFields)) {
    return;
  }

  // Keep the field if its path is present in the allowed fields
  if (allowedFields.includes(path)) {
    return;
  }

  const isAllowedNested = allowedFields.some(allowedPath => path.startsWith(`${allowedPath}.`));
  if (isAllowedNested) {
    return;
  }

  // Remove otherwise
  remove(key);
};
