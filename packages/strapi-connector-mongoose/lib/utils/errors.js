'use strict';

const isDuplicateEntryError = error => {
  return error.code === 11000; // MongoDB code for duplicate key error
};

const handleDatabaseError = error => {
  if (isDuplicateEntryError(error)) {
    strapi.log.warn('Duplicate entry', error.toString());
    throw new Error('Duplicate entry');
  }
  throw error;
};

module.exports = {
  handleDatabaseError,
};
