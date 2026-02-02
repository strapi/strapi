import DatabaseError from './database';

export default class NotNullError extends DatabaseError {
  constructor({ column = '' } = {}) {
    super(`Not null constraint violation${column ? ` on column ${column}` : ''}.`);
    this.name = 'NotNullError';
    this.details = { column };
    this.stack = '';
  }
}
