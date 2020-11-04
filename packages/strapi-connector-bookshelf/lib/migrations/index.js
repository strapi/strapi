'use strict';

const dpMigration = require('./draft-publish-migration');

const migrations = [dpMigration];

const runMigrationBeforeDBUpdates = async params => {
  for (const migration of migrations) {
    await migration.before(params);
  }
};

const runMigrationAfterDBUpdates = async params => {
  const reversedMigrations = [...migrations].reverse();
  for (const migration of reversedMigrations) {
    await migration.after(params);
  }
};

module.exports = {
  runMigrationBeforeDBUpdates,
  runMigrationAfterDBUpdates,
};
