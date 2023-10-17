import DatabaseError from './database';

export default class InvalidDateError extends DatabaseError {
  constructor(message = 'Invalid date format, expected YYYY-MM-DD') {
    super(message);
    this.name = 'InvalidDateFormat';
  }
}
