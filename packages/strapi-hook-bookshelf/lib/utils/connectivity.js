'use strict';

// Public node modules
const inquirer = require('inquirer');

const selectQueries = {
  postgres: "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  mysql: 'SELECT * FROM information_schema.tables',
  sqlite: 'select * from sqlite_master',
};

module.exports = async ({ scope, connection }) => {
  const knex = require('knex');

  const { settings } = connection;
  const client = knex({
    client: settings.client,
    connection: Object.assign({}, settings, {
      user: settings.username,
    }),
    useNullAsDefault: true,
  });

  const destroyClientAndThrow = err => {
    return client.destroy().then(
      () => {
        throw err;
      },
      () => {
        throw err;
      }
    );
  };

  await client.raw('select 1+1 as result').catch(destroyClientAndThrow);

  return client
    .raw(selectQueries[settings.client])
    .then(tables => {
      if (tables.rows && tables.rows.length === 0) {
        return;
      }

      if (scope.dbforce) {
        return;
      }

      console.log(
        '🤔 It seems that your database is not empty. Be aware that Strapi is going to automatically creates tables & columns, and might update columns which can corrupt data or cause data loss.'
      );

      return inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to continue with the ${
              settings.database
            } database:`,
          },
        ])
        .then(({ confirm }) => {
          if (!confirm) {
            // TODO: cancel somehow
            throw new Error('Not confirmed');
          }
        });
    })
    .then(() => client.destroy())
    .catch(destroyClientAndThrow);
};
