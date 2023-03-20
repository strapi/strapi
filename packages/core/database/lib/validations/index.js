'use strict';

const { validateRelations } = require('./relations');

/**
 * Validate if the database is in a valid state before starting the server.
 *
 * @param {*} db - Database instance
 */
async function validateDatabase(db) {
  const relationErrors = await validateRelations(db);
  const errorList = [...relationErrors];

  if (errorList.length > 0) {
    errorList.forEach((error) => strapi.log.error(error));
    throw new Error('There are errors in some of your models. Please check the logs above.');
  }
}

module.exports = { validateDatabase };
