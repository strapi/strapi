'use strict';

const DatabaseError = require('./database');

class InvalidTimeError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid time format, expected HH:mm:ss.SSS';
    this.details = {};
  }
}

module.exports = InvalidTimeError;
