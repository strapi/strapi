import { describe, expect, it } from 'vitest';

import {
  collectPoolTimeoutDetails,
  POOL_TIMEOUT_CODE,
  readPoolState,
  type KnexClientLike,
} from '../details';

const pool = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 60_000,
  numUsed: () => 10,
  numFree: () => 0,
  numPendingAcquires: () => 37,
  numPendingCreates: () => 0,
};

const input = {
  waitedMs: 60_012,
  cause: new Error('operation timed out for an unknown reason'),
  eventLoopDelay: { maxMs: 12, p99Ms: 4, windowMs: 30_000 },
  phase: 'runtime',
  hostname: 'api-7f9c',
  pid: 41,
};

describe('collectPoolTimeoutDetails', () => {
  it('reads the live pool, the effective and configured timeouts and the pool reason', () => {
    const client = {
      config: { acquireConnectionTimeout: 60_000, pool: { acquireTimeoutMillis: 600_000 } },
      pool,
    };

    expect(collectPoolTimeoutDetails(client, input)).toEqual({
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

  it('leaves out what it cannot read', () => {
    const details = collectPoolTimeoutDetails(
      { config: {}, pool: null },
      { ...input, cause: undefined }
    );

    expect(details.pool).toBeUndefined();
    expect(details.acquireTimeoutMs).toBeUndefined();
    expect(details.acquireConnectionTimeout).toBeUndefined();
    expect(details.poolAcquireTimeoutMillis).toBeUndefined();
    expect(details.poolReason).toBeUndefined();
  });

  it('ignores configured values that are not numbers', () => {
    const details = collectPoolTimeoutDetails(
      { config: { acquireConnectionTimeout: '60000' }, pool },
      input
    );

    expect(details.acquireConnectionTimeout).toBeUndefined();
  });
});

describe('readPoolState', () => {
  it('returns undefined when the pool is not initialized', () => {
    expect(readPoolState(undefined)).toBeUndefined();
  });

  it('returns undefined for a pool that only has acquire, release and destroy', () => {
    // knex wraps a native driver pool in an object with just these three methods
    const wrappedNativePool = {
      acquire: () => ({}),
      release: () => undefined,
      destroy: () => undefined,
    } as unknown as NonNullable<KnexClientLike['pool']>;

    expect(() => readPoolState(wrappedNativePool)).not.toThrow();
    expect(readPoolState(wrappedNativePool)).toBeUndefined();
    expect(
      collectPoolTimeoutDetails({ config: {}, pool: wrappedNativePool }, input).pool
    ).toBeUndefined();
  });
});
