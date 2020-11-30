'use strict';

const _ = require('lodash');

const createMigrationRunner = (migrationFunction, { hooks = [] } = {}) => {
  const beforeHook = async options => {
    const migrationInfos = [];
    for (const migration of hooks) {
      if (_.isFunction(migration.before)) {
        const migrationInfo = await migration.before(options);
        migrationInfos.push(migrationInfo);
      }
    }
    return migrationInfos;
  };

  const afterHook = async options => {
    for (const migration of hooks.slice(0).reverse()) {
      if (_.isFunction(migration.after)) {
        await migration.after(options);
      }
    }
  };

  const run = async options => {
    const migrationInfos = await beforeHook(options);
    await migrationFunction(options, migrationInfos);
    await afterHook(options);
  };

  return {
    run,
  };
};

module.exports = createMigrationRunner;
