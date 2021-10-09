'use strict';

const path = require('path');
const fse = require('fs-extra');
const { Umzug } = require('umzug');

const createStorage = require('./storage');

const wrapTransaction = db => fn => () =>
  db.getConnection().transaction(trx => Promise.resolve(fn(trx)));

// TODO: check multiple commands in one sql statement
const migrationResolver = ({ name, path, context }) => {
  const { db } = context;

  // if sql file run with knex raw
  if (path.match(/\.sql$/)) {
    const sql = fse.readFileSync(path, 'utf8');

    return {
      name,
      up: wrapTransaction(db)(knex => knex.raw(sql)),
      down() {},
    };
  }

  // NOTE: we can add some ts register if we want to handle ts migration files at some point
  const migration = require(path);
  return {
    name,
    up: wrapTransaction(db)(migration.up),
    down: wrapTransaction(db)(migration.down),
  };
};

const createUmzugProvider = db => {
  const migrationDir = path.join(strapi.dirs.root, 'database/migrations');

  fse.ensureDirSync(migrationDir);

  return new Umzug({
    storage: createStorage({
      db,
      tableName: db.config.settings.tablePrefix + 'strapi_migrations',
    }),
    context: { db },
    migrations: {
      glob: ['*.{js,sql}', { cwd: migrationDir }],
      resolve: migrationResolver,
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
