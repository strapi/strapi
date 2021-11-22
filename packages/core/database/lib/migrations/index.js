'use strict';

const path = require('path');
const fse = require('fs-extra');
const Umzug = require('umzug');

const createStorage = require('./storage');

// TODO: check multiple commands in one sql statement
const migrationResolver = path => {
  // if sql file run with knex raw
  if (path.match(/\.sql$/)) {
    const sql = fse.readFileSync(path, 'utf8');

    return {
      up: knex => knex.raw(sql),
      down() {},
    };
  }

  // NOTE: we can add some ts register if we want to handle ts migration files at some point
  return require(path);
};

const createUmzugProvider = db => {
  const migrationDir = path.join(strapi.dirs.root, 'database/migrations');

  fse.ensureDirSync(migrationDir);

  const wrapFn = fn => db => db.getConnection().transaction(trx => Promise.resolve(fn(trx)));
  const storage = createStorage({ db, tableName: 'strapi_migrations' });

  return new Umzug({
    storage,
    migrations: {
      path: migrationDir,
      pattern: /\.(js|sql)$/,
      params: [db],
      wrap: wrapFn,
      customResolver: migrationResolver,
    },
  });
};

// NOTE: when needed => add internal migrations for core & plugins. How do we overlap them with users migrations ?

/**
 * Creates migrations provider
 * @type {import('.').createMigrationsProvider}
 */
const createMigrationsProvider = db => {
  const migrations = createUmzugProvider(db);

  return {
    async shouldRun() {
      const pending = await migrations.pending();

      return pending.length > 0;
    },
    async up() {
      await migrations.up();
    },
    async down() {
      await migrations.down();
    },
  };
};

module.exports = { createMigrationsProvider };
