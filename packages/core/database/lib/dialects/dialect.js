'use strict';

class Dialect {
  constructor(db) {
    this.db = db;
  }

  configure() {}
  initialize() {}

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
