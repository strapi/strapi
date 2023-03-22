'use strict';

const DatabaseError = require('./database');

class InvalidDateTimeError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid datetime format, expected a timestamp or an ISO date';
    this.details = {};
  }
}

module.exports = InvalidDateTimeError;
