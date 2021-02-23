'use strict';
const debug = require('debug')('strapi-database:migration');
const { isFunction } = require('lodash/fp');

class MigrationManager {
  constructor(db) {
    debug('Initialize migration manager');
    this.db = db;
    this.migrations = [];
  }

  register(migration) {
    debug('Register migration');
    this.migrations.push(migration);
  }

  async run(fn, options, context = {}) {
    debug('Run migration');
    await this.runBefore(options, context);
    await fn(options, context);
    await this.runAfter(options, context);
  }

  async shouldRunStep(stepChecker, step, options, context) {
    if (!isFunction(step)) {
      return false;
    }

    if (!isFunction(stepChecker)) {
      return true;
    }

    return stepChecker(options, context);
  }

  async runBefore(options, context) {
    debug('Run before migrations');

    for (const migration of this.migrations) {
      const { shouldRunBefore, before } = migration;
      const willRunStep = await this.shouldRunStep(shouldRunBefore, before, options, context);

      if (willRunStep) {
        await migration.before(options, context);
      }
    }
  }

  async runAfter(options, context) {
    debug('Run after migrations');

    for (const migration of this.migrations.slice(0).reverse()) {
      const { shouldRunAfter, after } = migration;
      const willRunStep = await this.shouldRunStep(shouldRunAfter, after, options, context);

      if (willRunStep) {
        await migration.after(options, context);
      }
    }
  }
}

module.exports = strapi => {
  return new MigrationManager(strapi);
};
