export default class DatabaseError extends Error {
  details: unknown;

  constructor(message = 'A database error occured', details = {}) {
    super();
    this.name = 'DatabaseError';
    this.message = message;
    this.details = details;
  }
}
