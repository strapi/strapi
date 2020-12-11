'use strict';

const _ = require('lodash');

const createMigrationRunner = (migrationFunction, { hooks = [] } = {}, context = {}) => {
  const beforeHook = async (options, context) => {
    for (const migration of hooks) {
      if (_.isFunction(migration.before)) {
        await migration.before(options, context);
      }
    }
  };

  const afterHook = async (options, context) => {
    for (const migration of hooks.slice(0).reverse()) {
      if (_.isFunction(migration.after)) {
        await migration.after(options, context);
      }
    }
  };

  const run = async options => {
    await beforeHook(options, context);
    await migrationFunction(options, context);
    await afterHook(options, context);
  };

  return {
    run,
  };
};

module.exports = createMigrationRunner;
