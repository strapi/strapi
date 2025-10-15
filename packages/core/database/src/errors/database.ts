export default class DatabaseError extends Error {
  details: unknown;

  constructor(message = 'A database error occurred', details = {}) {
    super();
    this.name = 'DatabaseError';
    this.message = message;
    this.details = details;
  }
}
