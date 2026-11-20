import type { Knex } from 'knex';

import type { Database } from '..';
import { abortCtx } from '../abort-context';
import { QueryAbortedError } from '../errors';

/** Query types that only read. Every other type writes. */
const READ_TYPES = new Set(['select', 'count', 'max', 'min']);

/** @internal */
export const isReadQuery = (type: string) => READ_TYPES.has(type);

/**
 * The signal that applies to a query, or undefined when none does. Only reads are ever aborted,
 * and only until the unit of work has written: after a write, every later query runs to
 * completion so no partial work is left behind. A read inside a transaction that has not written
 * is aborted too; the caller's transaction then rolls back.
 *
 * @internal
 */
export function getActiveAbortSignal(
  db: Database,
  { type, forUpdate }: { type: string; forUpdate?: boolean }
): AbortSignal | undefined {
  // `forUpdate` locks rows, so it belongs to a unit of work that must finish
  if (!isReadQuery(type) || forUpdate) {
    return undefined;
  }

  if (db.config.settings.abortReadsOnRequestDisconnect !== true) {
    return undefined;
  }

  return abortCtx.get();
}

type Connection = { __knex__disposed?: unknown };

type CancellableClient = {
  canCancelQuery?: boolean;
  acquireConnection(): Promise<Connection>;
  releaseConnection(connection: unknown): Promise<void>;
  cancelQuery(connection: unknown): Promise<unknown>;
};

/**
 * Runs a knex read that is tied to `signal`: refuses it when the signal is already aborted and,
 * on clients that can cancel a running query (postgres, mysql), cancels it on the database when
 * the signal aborts, so it stops holding a pooled connection. Clients that cannot (sqlite) only get
 * the refusal. A query that was cancelled rejects with a `QueryAbortedError`.
 *
 * Inside a transaction, the query runs on the transaction's connection and that connection is the
 * one cancelled. The transaction is then unusable and must be rolled back, which `db.transaction`
 * does when its callback rejects.
 *
 * @internal
 */
export async function runAbortable<T>(
  db: Database,
  query: Knex.QueryBuilder,
  signal: AbortSignal,
  transaction?: Knex.Transaction
): Promise<T> {
  if (signal.aborted) {
    throw new QueryAbortedError();
  }

  // A transaction's client always hands out the transaction's own connection and never releases
  // it to the pool, so the same code path serves both cases
  const client = (transaction?.client ?? db.connection.client) as CancellableClient;

  if (client.canCancelQuery !== true) {
    return (await query) as T;
  }

  // The connection is acquired here, not by knex, so the query can be cancelled on it. knex does
  // not release a connection it was given with `.connection()`, so it is released in `finally`.
  const connection = await client.acquireConnection();
  let cancelled = false;
  let cancellation: Promise<void> | undefined;

  const onAbort = () => {
    cancelled = true;
    cancellation = client.cancelQuery(connection).then(
      () => undefined,
      (cancelError: unknown) => {
        // Same as knex does when cancelling a timed out query fails: never reuse a connection
        // whose query could not be stopped
        connection.__knex__disposed = cancelError;
      }
    );
  };

  try {
    // The pool can make a request wait for a connection long after the client left
    if (signal.aborted) {
      throw new QueryAbortedError();
    }

    signal.addEventListener('abort', onAbort, { once: true });

    return (await query.connection(connection as never)) as T;
  } catch (error) {
    if (cancelled && !(error instanceof QueryAbortedError)) {
      throw new QueryAbortedError(undefined, error);
    }

    throw error;
  } finally {
    signal.removeEventListener('abort', onAbort);
    // The cancel runs on another connection: it must be done before this one goes back to the pool,
    // or it could kill the query of whoever gets the connection next
    await cancellation;
    await client.releaseConnection(connection);
  }
}
