'use strict';

const DatabaseError = require('./database');

class InvalidDateError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid date format, expected YYYY-MM-DD';
    this.details = {};
  }
}

module.exports = InvalidDateError;
