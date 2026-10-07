import { describe, expect, it } from 'vitest';

import { POOL_TIMEOUT_CODE, type PoolTimeoutDetails } from '../details';
import { appendDocsLink, formatPoolTimeoutWarning, POOL_TIMEOUT_DOCS_URL } from '../format';

const details = (overrides: Partial<PoolTimeoutDetails> = {}): PoolTimeoutDetails => ({
  code: POOL_TIMEOUT_CODE,
  waitedMs: 60_012,
  acquireTimeoutMs: 60_000,
  pool: { used: 10, free: 0, max: 10, min: 2, pendingAcquires: 37, pendingCreates: 0 },
  poolReason: 'operation timed out for an unknown reason',
  eventLoopDelay: { maxMs: 12, p99Ms: 4, windowMs: 30_000 },
  phase: 'runtime',
  hostname: 'api-7f9c',
  pid: 41,
  ...overrides,
});

describe('appendDocsLink', () => {
  it('adds one trailing See <url>.', () => {
    expect(appendDocsLink('Knex: Timeout acquiring a connection.')).toBe(
      `Knex: Timeout acquiring a connection. See ${POOL_TIMEOUT_DOCS_URL}.`
    );
  });

  it('does not add it twice', () => {
    const once = appendDocsLink('Knex: Timeout acquiring a connection.');

    expect(appendDocsLink(once)).toBe(once);
  });
});

describe('formatPoolTimeoutWarning', () => {
  it('describes a saturated pool', () => {
    expect(formatPoolTimeoutWarning(details(), { suppressed: 214 })).toBe(
      [
        '[database] connection pool timeout: waited 60012 ms for a connection (acquire timeout 60000 ms)',
        '  - connections: 10 in use, 0 free, max 10, min 2',
        '  - waiting for a connection: 37, connections being opened: 0',
        '  - reason reported by the pool: operation timed out for an unknown reason',
        '  - event loop delay over the last 30 s: max 12 ms, p99 4 ms',
        '  - phase runtime, host api-7f9c, pid 41',
        '  - pool timeouts since the previous report: 214',
        `See ${POOL_TIMEOUT_DOCS_URL}.`,
      ].join('\n')
    );
  });

  it('describes a database refusing connections', () => {
    const text = formatPoolTimeoutWarning(
      details({
        waitedMs: 60_003,
        pool: { used: 0, free: 0, max: 10, min: 2, pendingAcquires: 12, pendingCreates: 2 },
        poolReason: 'connect ECONNREFUSED 10.0.3.4:5432',
        eventLoopDelay: { maxMs: 3, p99Ms: 1, windowMs: 30_000 },
        phase: 'boot',
      }),
      { suppressed: 0 }
    );

    expect(text).toBe(
      [
        '[database] connection pool timeout: waited 60003 ms for a connection (acquire timeout 60000 ms)',
        '  - connections: 0 in use, 0 free, max 10, min 2',
        '  - waiting for a connection: 12, connections being opened: 2',
        '  - reason reported by the pool: connect ECONNREFUSED 10.0.3.4:5432',
        '  - event loop delay over the last 30 s: max 3 ms, p99 1 ms',
        '  - phase boot, host api-7f9c, pid 41',
        `See ${POOL_TIMEOUT_DOCS_URL}.`,
      ].join('\n')
    );
  });

  it('describes a starved process', () => {
    const text = formatPoolTimeoutWarning(
      details({
        waitedMs: 61_850,
        pool: { used: 4, free: 6, max: 10, min: 2, pendingAcquires: 0, pendingCreates: 0 },
        eventLoopDelay: { maxMs: 2400, p99Ms: 1800, windowMs: 30_000 },
      }),
      { suppressed: 0 }
    );

    expect(text).toBe(
      [
        '[database] connection pool timeout: waited 61850 ms for a connection (acquire timeout 60000 ms)',
        '  - connections: 4 in use, 6 free, max 10, min 2',
        '  - waiting for a connection: 0, connections being opened: 0',
        '  - reason reported by the pool: operation timed out for an unknown reason',
        '  - event loop delay over the last 30 s: max 2400 ms, p99 1800 ms',
        '  - phase runtime, host api-7f9c, pid 41',
        `See ${POOL_TIMEOUT_DOCS_URL}.`,
      ].join('\n')
    );
  });

  it('adds the timeout settings bullet when both settings are present', () => {
    const text = formatPoolTimeoutWarning(
      details({
        acquireTimeoutMs: 2000,
        acquireConnectionTimeout: 2000,
        poolAcquireTimeoutMillis: 600_000,
      }),
      { suppressed: 0 }
    );

    expect(text).toContain(
      '  - timeout settings: acquireConnectionTimeout 2000, pool.acquireTimeoutMillis 600000 (knex applies the smaller)'
    );
  });

  it('says when the pool is not initialized and leaves out unknown facts', () => {
    const text = formatPoolTimeoutWarning(
      details({
        pool: undefined,
        poolReason: undefined,
        eventLoopDelay: undefined,
        phase: undefined,
      }),
      { suppressed: 0 }
    );

    expect(text).toContain('  - connections: the pool is not initialized');
    expect(text).toContain('  - reason reported by the pool: not available');
    expect(text).not.toContain('event loop delay');
    expect(text).toContain('  - host api-7f9c, pid 41');
  });

  it('never names a cause', () => {
    const text = formatPoolTimeoutWarning(details(), { suppressed: 0 });

    expect(text).not.toMatch(/probably|likely|because|cause/i);
  });
});
