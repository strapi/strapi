import DatabaseError from './database';

/**
 * A `select` was refused or cancelled because the request that issued it was aborted (the client
 * disconnected before the response ended). `cause` is the driver error when a running query was
 * cancelled. Nobody is waiting for the result, so this is not an internal error.
 */
export default class RequestAbortedError extends DatabaseError {
  constructor(message = 'The request was aborted before the query completed', cause?: unknown) {
    super(message);
    this.name = 'RequestAbortedError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
