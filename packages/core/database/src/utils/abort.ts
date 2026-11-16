import type { Knex } from 'knex';

import type { Database } from '..';
import { abortCtx } from '../abort-context';
import { transactionCtx } from '../transaction-context';
import { RequestAbortedError } from '../errors';

/**
 * The signal that applies to a query, or undefined when none does. Only `select` queries that run
 * outside a transaction are ever aborted: a write, or anything inside a transaction, always runs
 * to completion so no partial work is left behind.
 *
 * @internal
 */
export function getActiveAbortSignal(
  db: Database,
  { type, transaction, forUpdate }: { type: string; transaction?: unknown; forUpdate?: boolean }
): AbortSignal | undefined {
  // `forUpdate` locks rows, so it belongs to a unit of work that must finish
  if (type !== 'select' || transaction || forUpdate || transactionCtx.get()) {
    return undefined;
  }

  if (db.config.settings.cancelQueriesOnClientDisconnect !== true) {
    return undefined;
  }

  return abortCtx.get();
}

type CancellableClient = {
  canCancelQuery?: boolean;
  acquireConnection(): Promise<{ __knex__disposed?: unknown }>;
  releaseConnection(connection: unknown): Promise<void>;
  cancelQuery(connection: unknown): Promise<unknown>;
};

/**
 * Runs a knex select that is tied to `signal`: refuses it when the signal is already aborted and,
 * on clients that can cancel a running query (postgres, mysql), cancels it on the database when
 * the signal aborts, so it stops holding a pooled connection. Clients that cannot (sqlite) only get
 * the refusal. A query that was cancelled rejects with a `RequestAbortedError`.
 *
 * @internal
 */
export async function runAbortable<T>(
  db: Database,
  query: Knex.QueryBuilder,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    throw new RequestAbortedError();
  }

  const client = db.connection.client as CancellableClient;

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
      throw new RequestAbortedError();
    }

    signal.addEventListener('abort', onAbort, { once: true });

    return (await query.connection(connection as never)) as T;
  } catch (error) {
    if (cancelled && !(error instanceof RequestAbortedError)) {
      throw new RequestAbortedError(undefined, error);
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
