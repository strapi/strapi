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

  // TODO: pass query info to display some more metadata
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
