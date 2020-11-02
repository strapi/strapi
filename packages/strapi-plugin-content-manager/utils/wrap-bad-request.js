'use strict';

module.exports = fn => async () => {
  try {
    await fn();
  } catch (error) {
    if (strapi.errors.isBoom(error)) {
      throw error;
    }

    // these are errors like unique constraints
    strapi.log.error(error);
    throw strapi.errors.badRequest('Invalid input data. Please verify unique constraints');
  }
};
