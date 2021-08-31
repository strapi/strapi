'use strict';

module.exports = fn => async (...args) => {
  try {
    await fn(...args);
  } catch (error) {
    if (strapi.errors.isBoom(error)) {
      throw error;
    }

    // these are errors like unique constraints
    strapi.log.error(error);
    throw strapi.errors.badRequest('Invalid input data. Please verify unique constraints');
  }
};
