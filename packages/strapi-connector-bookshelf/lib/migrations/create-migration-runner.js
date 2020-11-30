'use strict';

const _ = require('lodash');

const createMigrationRunner = (migrationFunction, { hooks = [] } = {}) => {
  const beforeHook = async options => {
    for (const migration of hooks) {
      if (_.isFunction(migration.before)) {
        await migration.before(options);
      }
    }
  };

  const afterHook = async options => {
    for (const migration of hooks.slice(0).reverse()) {
      if (_.isFunction(migration.after)) {
        await migration.after(options);
      }
    }
  };

  const run = async options => {
    await beforeHook(options);
    await migrationFunction(options);
    await afterHook(options);
  };

  return {
    run,
  };
};

module.exports = createMigrationRunner;
