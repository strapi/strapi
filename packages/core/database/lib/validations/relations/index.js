'use strict';

const { validateBidirectionalRelations } = require('./bidirectional');

/**
 * Validates if relations data and tables are in a valid state before
 * starting the server.
 */
const validateRelations = async (db) => {
  const bidirectionalRelationsErrors = await validateBidirectionalRelations(db);
  return [...bidirectionalRelationsErrors];
};

module.exports = { validateRelations };
