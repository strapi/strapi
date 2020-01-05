'use strict';

// Public node modules
const inquirer = require('inquirer');

const hasResults = rows => {
  if (!rows || rows.length === 0) return true;
  return false;
};

const checkDatabaseIsEmpty = {
  postgres: client =>
    client
      .select('tablename')
      .from('pg_tables')
      .where('schemaname', 'public')
      .then(hasResults),

  mysql: (client, { database }) =>
    client
      .select()
      .from('information_schema.tables')
      .where('table_schema', database)
      .then(hasResults),

  sqlite: client =>
    client
      .select()
      .from('sqlite_master')
      .then(hasResults),
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

  return checkDatabaseIsEmpty[settings.client](client, settings)
    .then(isEmpty => {
      if (isEmpty) return;
      if (scope.dbforce) return;

      console.log();
      console.error(
        'It seems that your database is not empty.\nStrapi automatically creates tables and columns which might corrupt the data already present in your database.'
      );

      return inquirer
        .prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to continue with the ${settings.database} database:`,
          },
        ])
        .then(({ confirm }) => {
          // send restart flag to retry
          if (!confirm) return { shouldRetry: true };
        });
    })
    .then(res => client.destroy().then(() => res))
    .catch(destroyClientAndThrow);
};
