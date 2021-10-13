'use strict';

const isDuplicateEntryError = error => {
  // postgres
  if (error.code === '23505') {
    return true;
  }

  // mysql
  if (error.code === 'ER_DUP_ENTRY') {
    return true;
  }

  // sqlite
  if (error.toString().includes('SQLITE_CONSTRAINT: UNIQUE')) {
    return true;
  }

  return false;
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
