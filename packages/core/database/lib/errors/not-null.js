'use strict';

const DatabaseError = require('./database');

class NotNullError extends DatabaseError {
  constructor({ column = '' } = {}) {
    super();
    this.name = 'NotNullError';
    this.message = `Not null constraint violation${column ? ` on column ${column}` : ''}.`;
    this.details = { column };
    this.stack = '';
  }
}

module.exports = NotNullError;
