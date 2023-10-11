import DatabaseError from './database';

export default class InvalidRelationError extends DatabaseError {
  constructor(message = 'Invalid relation format') {
    super(message);
    this.name = 'InvalidRelationFormat';
  }
}
