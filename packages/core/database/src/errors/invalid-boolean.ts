import DatabaseError from './database';

export default class InvalidBooleanError extends DatabaseError {
  constructor(
    message = 'Invalid boolean, expected one of true, t, 1, false, f, 0 (case-insensitive)'
  ) {
    super(message);
    this.name = 'InvalidBooleanFormat';
  }
}
