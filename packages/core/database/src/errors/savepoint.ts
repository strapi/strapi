import DatabaseError from './database';

/**
 * The database rejected releasing or rolling back to a savepoint, e.g. because it already rolled
 * back the whole transaction (MySQL on a deadlock): the transaction it was in can't be trusted, so
 * the caller must fail it. `cause` is the database's error; `details.error` is what the savepoint's
 * callback threw, when it threw.
 */
export default class SavepointError extends DatabaseError {
  constructor(message: string, { cause, error }: { cause: unknown; error?: unknown }) {
    super(message, error === undefined ? {} : { error });
    this.name = 'SavepointError';
    this.cause = cause;
  }
}
