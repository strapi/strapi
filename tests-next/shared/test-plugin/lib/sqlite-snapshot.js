'use strict';

/**
 * SQLite snapshot and restore for the test plugin (CMS-1943 spike, CMS-1950):
 *
 * - snapshot: `VACUUM INTO` a file next to the DB, from the running server. Take it after the
 *   seed and the role logins, so the admin sessions it holds keep every token valid.
 * - restore (about 20 ms): copy every table back from the snapshot through the live connection
 *   (`ATTACH` + `DELETE`/`INSERT`). Same schema only: specs that change the schema aren't
 *   supported yet.
 */

const fs = require('node:fs');
const path = require('node:path');

const constants = require('../constants.json');

/** @param {any} strapi */
const paths = (strapi) => {
  const dbFile = strapi.config.get('database.connection.connection.filename');
  const dir = path.dirname(dbFile);
  return {
    dbFile,
    snapshot: path.join(dir, constants.sqliteSnapshotFile),
  };
};

/** @param {any} strapi */
const isSqlite = (strapi) =>
  ['sqlite', 'better-sqlite3'].includes(strapi.config.get('database.connection.client'));

/** @param {any} strapi */
const snapshot = async (strapi) => {
  const { snapshot: file } = paths(strapi);
  fs.rmSync(file, { force: true });
  await strapi.db.connection.raw('VACUUM INTO ?', [file]);
};

/** @param {any} strapi */
const hasSnapshot = (strapi) => fs.existsSync(paths(strapi).snapshot);

/** @param {any} strapi */
const restoreSql = async (strapi) => {
  const { snapshot: file } = paths(strapi);
  const knex = strapi.db.connection;

  // Foreign keys can't be toggled inside a transaction, and ATTACH needs the single SQLite
  // connection of the pool, so both run around it on the same connection.
  await knex.raw('PRAGMA foreign_keys = OFF');
  await knex.raw('ATTACH DATABASE ? AS snapshot', [file]);
  try {
    /** @type {Array<{ name: string }>} */
    const tables = await knex.raw(
      "SELECT name FROM snapshot.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );
    await knex.transaction(async (/** @type {any} */ trx) => {
      for (const { name } of tables) {
        await trx.raw(`DELETE FROM main."${name}"`);
        await trx.raw(`INSERT INTO main."${name}" SELECT * FROM snapshot."${name}"`);
      }
      await trx.raw('DELETE FROM main.sqlite_sequence');
      await trx.raw('INSERT INTO main.sqlite_sequence SELECT * FROM snapshot.sqlite_sequence');
    });
  } finally {
    await knex.raw('DETACH DATABASE snapshot');
    await knex.raw('PRAGMA foreign_keys = ON');
  }
};

module.exports = {
  hasSnapshot,
  isSqlite,
  restoreSql,
  snapshot,
};
