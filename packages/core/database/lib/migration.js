'use strict';

const path = require('path');
const fse = require('fs-extra');
const Umzug = require('umzug');

class CustomStorage {
  constructor(opts = {}) {
    this.tableName = opts.tableName;
    this.knex = opts.db.connection;
  }

  async logMigration(migrationName) {
    await this.knex
      .insert({
        name: migrationName,
        time: new Date(),
      })
      .into(this.tableName);
  }

  async unlogMigration(migrationName) {
    await this.knex(this.tableName)
      .del()
      .where({ name: migrationName });
  }

  async executed() {
    if (!(await this.hasMigrationTable())) {
      await this.createMigrationTable();
      return [];
    }

    const logs = await this.knex
      .select()
      .from(this.tableName)
      .orderBy('time');

    return logs.map(log => log.name);
  }

  hasMigrationTable() {
    return this.knex.schema.hasTable(this.tableName);
  }

  createMigrationTable() {
    return this.knex.schema.createTable(this.tableName, table => {
      table.increments('id');
      table.string('name');
      table.datetime('time', { useTz: false });
    });
  }
}

const createMigrationProvider = db => {
  const migrationDir = path.join(strapi.dir, 'database/migrations');

  fse.ensureDirSync(migrationDir);

  const migrations = new Umzug({
    storage: new CustomStorage({ db, tableName: 'strapi_migrations' }),
    migrations: {
      path: migrationDir,
      pattern: /\.(js|sql)$/,
      params: [db],
      wrap(fn) {
        return db => db.connection.transaction(trx => Promise.resolve(fn(trx)));
      },
      customResolver(path) {
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
      },
    },
  });

  // TODO: add internal migrations for core & plugins
  // How do we intersperse them

  // const internalMigrations = new Umzug({
  //   storage: new CustomStorage({ db, tableName: 'strapi_internal_migrations' }),
  //   migrations: {
  //     path: path.join(__dirname, 'migrations'),
  //     params: [db],
  //     wrap: fn => db => {
  //       return db.connection.transaction(trx => Promise.resolve(fn(trx)));
  //     },
  //   },
  // });

  return {
    async up() {
      // await migrations.down();
      await migrations.up();
      // await internalMigrations.up();
    },
    async down() {
      await migrations.down();
      // await internalMigrations.down();
    },
  };
};

module.exports = createMigrationProvider;
