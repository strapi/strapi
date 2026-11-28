'use strict';

/**
 * Knex `raw()` result shape:
 * - Postgres: `{ rows }`
 * - MySQL: `[rows, fields]`
 * - SQLite: the row array itself
 *
 * `Array.isArray` is true for the MySQL tuple, so treating every array as rows
 * counts the fields packet as a second row.
 */
const rowsFromRaw = (result) => {
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }

  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }

  if (Array.isArray(result)) {
    return result;
  }

  return [];
};

module.exports = { rowsFromRaw };
