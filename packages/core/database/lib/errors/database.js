'use strict';

class DatabaseError extends Error {
  constructor(message, details = {}) {
    super();
    this.name = 'DatabaseError';
    this.message = message || 'A database error occured';
    this.details = details;
  }
}

module.exports = DatabaseError;
