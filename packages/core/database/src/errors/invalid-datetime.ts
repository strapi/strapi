import DatabaseError from './database';

export default class InvalidDateTimeError extends DatabaseError {
  constructor(message = 'Invalid relation format') {
    super(message);
    this.name = 'InvalidDatetimeFormat';
  }
}
