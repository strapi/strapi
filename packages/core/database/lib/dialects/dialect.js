'use strict';

/**
 * @typedef {import('@strapi/database').Database} Database
 */

class Dialect {
  /**
   * @param {Database} db
   */
  constructor(db) {
    this.db = db;
  }

  configure() {}
  initialize() {}

  /**
   * @param {string} type
   */
  getSqlType(type) {
    return type;
  }

  canAlterConstraints() {
    return true;
  }

  usesForeignKeys() {
    return false;
  }

  useReturning() {
    return false;
  }

  supportsUnsigned() {
    return false;
  }

  async startSchemaUpdate() {}
  async endSchemaUpdate() {}

  /**
   * @param {Error | { message?: string }} error
   */
  transformErrors(error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(error.message);
  }
}

module.exports = {
  Dialect,
};
