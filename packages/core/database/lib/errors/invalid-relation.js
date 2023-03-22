'use strict';

const DatabaseError = require('./database');

class InvalidRelationError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidRelationFormat';
    this.message = message || 'Invalid relation format';
    this.details = {};
  }
}

module.exports = InvalidRelationError;
