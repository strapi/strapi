import DatabaseError from './database';

export default class InvalidTimeError extends DatabaseError {
  constructor(message = 'Invalid time format, expected HH:mm:ss.SSS') {
    super(message);
    this.name = 'InvalidTimeFormat';
  }
}
