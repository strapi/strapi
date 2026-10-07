import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';

import {
  installPoolDiagnostics,
  isPoolAcquireTimeout,
  POOL_TIMEOUT_CODE,
  POOL_TIMEOUT_DOCS_URL,
} from '..';
import type { EventLoopMonitor } from '../event-loop';

const ACQUIRE_TIMEOUT_MESSAGE =
  'Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?';

class KnexTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnexTimeoutError';
  }
}

const acquireTimeout = () =>
  Object.assign(new KnexTimeoutError(ACQUIRE_TIMEOUT_MESSAGE), {
    cause: new Error('operation timed out for an unknown reason'),
  });

type Annotated = Error & { details?: Record<string, any> };

const setup = ({ fail, waitMs = 60_012 }: { fail?: () => Error; waitMs?: number } = {}) => {
  let clock = 1_000_000;
  const thrown: Error[] = [];
  const pool = {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60_000,
    numUsed: vi.fn(() => 10),
    numFree: vi.fn(() => 0),
    numPendingAcquires: vi.fn(() => 37),
    numPendingCreates: vi.fn(() => 0),
  };
  const original = vi.fn(async () => {
    await Promise.resolve();
    clock += waitMs;
    if (fail) {
      const error = fail();
      thrown.push(error);
      throw error;
    }
    return { __knexUid: '__knexUid1' };
  });
  const client = {
    config: { acquireConnectionTimeout: 60_000, pool: { acquireTimeoutMillis: 600_000 } },
    pool,
    acquireConnection: original as () => Promise<unknown>,
  };
  const logger = { warn: vi.fn() };
  const eventLoopMonitor: EventLoopMonitor = {
    read: vi.fn(() => ({ maxMs: 12, p99Ms: 4, windowMs: 30_000 })),
    stop: vi.fn(),
  };
  const diagnostics = installPoolDiagnostics({ client } as unknown as Knex, {
    logger,
    now: () => clock,
    hostname: 'api-7f9c',
    pid: 41,
    getPhase: () => 'runtime',
    eventLoopMonitor,
  });

  return {
    client,
    pool,
    logger,
    eventLoopMonitor,
    diagnostics,
    thrown,
    original,
    advance(ms: number) {
      clock += ms;
    },
  };
};

const acquireError = async (client: {
  acquireConnection(): Promise<unknown>;
}): Promise<Annotated> => {
  try {
    await client.acquireConnection();
  } catch (error) {
    return error as Annotated;
  }
  throw new Error('expected the acquire to fail');
};

describe('isPoolAcquireTimeout', () => {
  it('matches knex acquire timeouts only', () => {
    expect(isPoolAcquireTimeout(new KnexTimeoutError(ACQUIRE_TIMEOUT_MESSAGE))).toBe(true);
    expect(
      isPoolAcquireTimeout(
        new KnexTimeoutError('Defined query timeout of 100ms exceeded when running query.')
      )
    ).toBe(false);
    expect(isPoolAcquireTimeout(new Error(ACQUIRE_TIMEOUT_MESSAGE))).toBe(false);
    expect(isPoolAcquireTimeout('Knex: Timeout acquiring a connection')).toBe(false);
  });
});

describe('installPoolDiagnostics', () => {
  const originalLimit = Error.stackTraceLimit;

  afterEach(() => {
    Error.stackTraceLimit = originalLimit;
  });

  it('keeps the error object and appends the docs link to its one-line message', async () => {
    const { client, thrown } = setup({ fail: acquireTimeout });

    const error = await acquireError(client);

    expect(error).toBe(thrown[0]);
    expect(error).toBeInstanceOf(KnexTimeoutError);
    expect(error.name).toBe('KnexTimeoutError');
    expect(error.message).toBe(`${ACQUIRE_TIMEOUT_MESSAGE} See ${POOL_TIMEOUT_DOCS_URL}.`);
    expect(error.message).not.toContain('\n');
    expect(error.stack?.split('\n')[0]).toBe(
      `KnexTimeoutError: ${ACQUIRE_TIMEOUT_MESSAGE} See ${POOL_TIMEOUT_DOCS_URL}.`
    );
  });

  it('attaches the pool facts as details', async () => {
    const { client } = setup({ fail: acquireTimeout });

    const error = await acquireError(client);

    expect(error.details).toEqual({
      code: POOL_TIMEOUT_CODE,
      waitedMs: 60_012,
      acquireTimeoutMs: 60_000,
      acquireConnectionTimeout: 60_000,
      poolAcquireTimeoutMillis: 600_000,
      pool: { used: 10, free: 0, max: 10, min: 2, pendingAcquires: 37, pendingCreates: 0 },
      poolReason: 'operation timed out for an unknown reason',
      eventLoopDelay: { maxMs: 12, p99Ms: 4, windowMs: 30_000 },
      phase: 'runtime',
      hostname: 'api-7f9c',
      pid: 41,
    });
  });

  it('logs one warning block, then at most one per 30 s with the count it held back', async () => {
    const { client, logger, eventLoopMonitor, advance } = setup({
      fail: acquireTimeout,
      waitMs: 0,
    });

    await acquireError(client);
    advance(10_000);
    await acquireError(client);
    await acquireError(client);
    advance(20_000);
    await acquireError(client);

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn.mock.calls[0][0]).toMatch(/^\[database\] connection pool timeout: /);
    expect(logger.warn.mock.calls[0][0]).not.toContain('pool timeouts since the previous report');
    expect(logger.warn.mock.calls[1][0]).toContain(
      '  - pool timeouts since the previous report: 2'
    );
    // ruling F3: the window rotates on its own; every timeout reads it, nothing resets it
    expect(eventLoopMonitor.read).toHaveBeenCalledTimes(4);
  });

  it('passes other acquire errors through untouched', async () => {
    const refused = () =>
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    const { client, logger, thrown } = setup({ fail: refused });

    const error = await acquireError(client);

    expect(error).toBe(thrown[0]);
    expect(error.message).toBe('connect ECONNREFUSED 127.0.0.1:5432');
    expect(error.details).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('ignores knex query timeouts', async () => {
    const queryTimeout = () =>
      new KnexTimeoutError('Defined query timeout of 100ms exceeded when running query.');
    const { client, logger } = setup({ fail: queryTimeout });

    const error = await acquireError(client);

    expect(error.message).toBe('Defined query timeout of 100ms exceeded when running query.');
    expect(error.details).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('leaves the message and details unchanged when reading the pool fails', async () => {
    const { client, pool, logger } = setup({ fail: acquireTimeout });
    pool.numUsed.mockImplementation(() => {
      throw new Error('pool exploded');
    });

    const error = await acquireError(client);

    expect(error.message).toBe(ACQUIRE_TIMEOUT_MESSAGE);
    expect(error.details).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('re-captures the stack beyond the default 10 frames', async () => {
    const { client } = setup({ fail: acquireTimeout });
    async function nest(depth: number): Promise<unknown> {
      const result = depth === 0 ? await client.acquireConnection() : await nest(depth - 1);
      return result;
    }
    async function deepCaller() {
      const result = await nest(15);
      return result;
    }
    Error.stackTraceLimit = 10;

    const error = (await deepCaller().catch((e: Error) => e)) as Error;

    expect(error.stack).toContain('deepCaller');
  });

  it('returns the connection unchanged on success', async () => {
    const { client } = setup();

    await expect(client.acquireConnection()).resolves.toEqual({ __knexUid: '__knexUid1' });
  });

  it('restores acquireConnection and stops the event loop monitor on dispose', () => {
    const { client, original, diagnostics, eventLoopMonitor } = setup();
    expect(client.acquireConnection).not.toBe(original);

    diagnostics.dispose();

    expect(client.acquireConnection).toBe(original);
    expect(eventLoopMonitor.stop).toHaveBeenCalled();
  });
});
