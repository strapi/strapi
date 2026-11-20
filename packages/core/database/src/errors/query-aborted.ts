import DatabaseError from './database';

/**
 * A read was refused or cancelled because the abort signal of the work that issued it was aborted
 * (for a request: the client disconnected before the response ended). `cause` is the driver error
 * when a running query was cancelled. Nobody is waiting for the result, so this is not an internal
 * error.
 */
export default class QueryAbortedError extends DatabaseError {
  constructor(message = 'The query was aborted before it completed', cause?: unknown) {
    super(message);
    this.name = 'QueryAbortedError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
