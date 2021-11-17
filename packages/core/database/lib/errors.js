'use strict';

/* DatabaseError */
class DatabaseError extends Error {
  constructor(message, details = {}) {
    super();
    this.name = 'DatabaseError';
    this.message = message || 'A database error occured';
    this.details = details;
  }
}

class NotNullConstraint extends DatabaseError {
  constructor({ column = '' } = {}) {
    super();
    this.name = 'NotNullConstraint';
    this.message = `Not null constraint violation${column ? ` on column ${column}` : ''}.`;
    this.details = { column };
    this.stack = '';
  }
}

class InvalidTimeError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid time format, expected HH:mm:ss.SSS';
    this.details = {};
  }
}

class InvalidDateError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid date format, expected YYYY-MM-DD';
    this.details = {};
  }
}

class InvalidDateTimeError extends DatabaseError {
  constructor(message) {
    super();
    this.name = 'InvalidTimeFormat';
    this.message = message || 'Invalid datetime format, expected a timestamp or an ISO date';
    this.details = {};
  }
}

module.exports = {
  DatabaseError,
  NotNullConstraint,
  InvalidTimeError,
  InvalidDateError,
  InvalidDateTimeError,
};
