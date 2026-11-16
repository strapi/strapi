import { describe, expect, it, vi } from 'vitest';

import type { Database } from '..';
import { RequestAbortedError } from '../errors';
import { runAbortable } from '../utils/abort';

type Conn = { id: number; __knex__disposed?: unknown };

const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const setup = ({ cancel }: { cancel?: () => Promise<unknown> } = {}) => {
  const connection: Conn = { id: 1 };
  const events: string[] = [];
  const client = {
    canCancelQuery: true,
    acquireConnection: vi.fn(async () => {
      events.push('acquire');
      return connection;
    }),
    releaseConnection: vi.fn(async () => {
      events.push('release');
    }),
    cancelQuery: vi.fn(async () => {
      events.push('cancel');
      return cancel?.();
    }),
  };
  const db = { connection: { client } } as unknown as Database;
  const result = deferred<string>();
  const query = {
    connection: vi.fn(() => result.promise),
  };

  return { connection, events, client, db, result, query: query as any };
};

describe('runAbortable with a cancellable client', () => {
  it('returns the rows and releases the connection once when not aborted', async () => {
    const { db, client, query, result, connection } = setup();
    const controller = new AbortController();

    const promise = runAbortable(db, query, controller.signal);
    result.resolve('rows');

    await expect(promise).resolves.toBe('rows');
    expect(query.connection).toHaveBeenCalledWith(connection);
    expect(client.releaseConnection).toHaveBeenCalledTimes(1);
    expect(client.cancelQuery).not.toHaveBeenCalled();
  });

  it('cancels the running query on abort and rejects with RequestAbortedError', async () => {
    const { db, client, query, result, connection } = setup();
    const controller = new AbortController();

    const promise = runAbortable(db, query, controller.signal);
    await vi.waitFor(() => expect(query.connection).toHaveBeenCalled());
    controller.abort();
    const driverError = new Error('canceling statement due to user request');
    result.reject(driverError);

    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(RequestAbortedError);
    expect((error as RequestAbortedError).cause).toBe(driverError);
    expect(client.cancelQuery).toHaveBeenCalledWith(connection);
    expect(client.releaseConnection).toHaveBeenCalledTimes(1);
    expect(connection.__knex__disposed).toBeUndefined();
  });

  it('waits for the cancel to finish before releasing the connection', async () => {
    const cancel = deferred();
    const { db, query, result, events } = setup({ cancel: () => cancel.promise });
    const controller = new AbortController();

    const promise = runAbortable(db, query, controller.signal);
    await vi.waitFor(() => expect(query.connection).toHaveBeenCalled());
    controller.abort();
    result.reject(new Error('cancelled'));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(events).toEqual(['acquire', 'cancel']);

    cancel.resolve();
    await promise.catch(() => undefined);

    expect(events).toEqual(['acquire', 'cancel', 'release']);
  });

  it('marks the connection disposed when the cancel fails, and still releases it once', async () => {
    const cancelError = new Error('cancel failed');
    const { db, client, query, result, connection } = setup({
      cancel: () => Promise.reject(cancelError),
    });
    const controller = new AbortController();

    const promise = runAbortable(db, query, controller.signal);
    await vi.waitFor(() => expect(query.connection).toHaveBeenCalled());
    controller.abort();
    result.reject(new Error('driver'));

    await expect(promise).rejects.toBeInstanceOf(RequestAbortedError);
    expect(connection.__knex__disposed).toBe(cancelError);
    expect(client.releaseConnection).toHaveBeenCalledTimes(1);
  });

  it('does not cancel anything when the signal aborts after the query finished', async () => {
    const { db, client, query, result } = setup();
    const controller = new AbortController();

    const promise = runAbortable(db, query, controller.signal);
    result.resolve('rows');
    await promise;
    controller.abort();

    expect(client.cancelQuery).not.toHaveBeenCalled();
    expect(client.releaseConnection).toHaveBeenCalledTimes(1);
  });

  it('releases the connection without sending the query when the signal aborted while acquiring', async () => {
    const { db, client, query } = setup();
    const controller = new AbortController();
    client.acquireConnection.mockImplementation(async () => {
      controller.abort();
      return { id: 1 };
    });

    await expect(runAbortable(db, query, controller.signal)).rejects.toBeInstanceOf(
      RequestAbortedError
    );
    expect(query.connection).not.toHaveBeenCalled();
    expect(client.cancelQuery).not.toHaveBeenCalled();
    expect(client.releaseConnection).toHaveBeenCalledTimes(1);
  });

  it('does not acquire a connection when the signal is already aborted', async () => {
    const { db, client, query } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(runAbortable(db, query, controller.signal)).rejects.toBeInstanceOf(
      RequestAbortedError
    );
    expect(client.acquireConnection).not.toHaveBeenCalled();
  });
});
