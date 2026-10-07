import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import knex from 'knex';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { Database, POOL_TIMEOUT_DOCS_URL, type PoolDiagnostics, type PoolTimeoutDetails } from '..';

const ACQUIRE_TIMEOUT_MESSAGE =
  'Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?';

const tempDbFiles: string[] = [];

const tempDbFile = () => {
  const file = path.join(
    os.tmpdir(),
    `strapi-pool-diag-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );
  tempDbFiles.push(file);
  return file;
};

const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

const createDb = (
  logger: ReturnType<typeof createLogger>,
  settings: Record<string, unknown> = {},
  getPhase?: () => string
) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 200,
    },
    settings: { migrations: { dir: os.tmpdir() }, ...settings },
    logger,
    getPhase,
  });

// A query that does not use the transaction it runs in waits for the only connection
async function queryOutsideTheTransaction(db: Database) {
  const result = await db.transaction(async () => {
    await db.connection.raw('select 1');
  });
  return result;
}

const blocks = (logger: ReturnType<typeof createLogger>) =>
  logger.warn.mock.calls
    .map(([message]) => String(message))
    .filter((message) => message.startsWith('[database] connection pool timeout'));

type Annotated = Error & { details?: Partial<PoolTimeoutDetails> };

describe('Database pool timeout diagnostics', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  afterAll(() => {
    for (const file of tempDbFiles) {
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        rmSync(`${file}${suffix}`, { force: true });
      }
    }
  });

  it('describes a query waiting on a connection its own transaction holds', async () => {
    const logger = createLogger();
    db = createDb(logger, {}, () => 'runtime');

    const error = (await queryOutsideTheTransaction(db).catch((e: Error) => e)) as Annotated;

    expect(error).toBeInstanceOf(knex.KnexTimeoutError);
    expect(error.message).toBe(`${ACQUIRE_TIMEOUT_MESSAGE} See ${POOL_TIMEOUT_DOCS_URL}.`);
    expect(error.details).toMatchObject({
      code: 'DB_POOL_ACQUIRE_TIMEOUT',
      acquireTimeoutMs: 200,
      pool: { used: 1, max: 1 },
      poolReason: 'operation timed out for an unknown reason',
      phase: 'runtime',
    });
    expect(error.details?.waitedMs).toBeGreaterThanOrEqual(190);
    expect(error.stack).toContain('queryOutsideTheTransaction');
    expect(blocks(logger)).toHaveLength(1);
  });

  it('labels the phase set with runInPhase', async () => {
    const logger = createLogger();
    db = createDb(logger, {}, () => 'runtime');
    const database = db;

    const error = (await database
      .runInPhase('schema sync', () => queryOutsideTheTransaction(database))
      .catch((e: Error) => e)) as Annotated;

    expect(error.details?.phase).toBe('schema sync');
  });

  it('keeps the outer label after a nested runInPhase returns', async () => {
    const logger = createLogger();
    db = createDb(logger, {}, () => 'runtime');
    const database = db;

    const error = (await database
      .runInPhase('outer', async () => {
        await database.runInPhase('inner', async () => undefined);
        return queryOutsideTheTransaction(database);
      })
      .catch((e: Error) => e)) as Annotated;

    expect(error.details?.phase).toBe('outer');
  });

  it('restores the previous label when the function passed to runInPhase throws', async () => {
    const logger = createLogger();
    db = createDb(logger, {}, () => 'runtime');
    const database = db;

    await expect(
      database.runInPhase('schema sync', async () => {
        throw new Error('migration failed');
      })
    ).rejects.toThrow('migration failed');

    const error = (await queryOutsideTheTransaction(database).catch((e: Error) => e)) as Annotated;

    expect(error.details?.phase).toBe('runtime');
  });

  it('can be turned off', async () => {
    const logger = createLogger();
    db = createDb(logger, { poolTimeoutDiagnostics: false });

    const error = (await queryOutsideTheTransaction(db).catch((e: Error) => e)) as Annotated;

    expect(db.poolDiagnostics).toBeUndefined();
    expect(error.message).toBe(ACQUIRE_TIMEOUT_MESSAGE);
    expect(error.details).toBeUndefined();
    expect(blocks(logger)).toHaveLength(0);
  });

  it('still boots when the diagnostics cannot be installed', () => {
    const logger = createLogger();
    const hostname = vi.spyOn(os, 'hostname').mockImplementation(() => {
      throw new Error('hostname unavailable');
    });

    try {
      db = createDb(logger);
    } finally {
      hostname.mockRestore();
    }

    expect(db.poolDiagnostics).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      '[database] pool timeout diagnostics not installed: hostname unavailable'
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('disposes the diagnostics even when clearing the lifecycles throws', async () => {
    const logger = createLogger();
    const database = createDb(logger);
    const diagnostics = database.poolDiagnostics as PoolDiagnostics;
    const dispose = vi.spyOn(diagnostics, 'dispose');
    vi.spyOn(database.lifecycles, 'clear').mockRejectedValueOnce(new Error('clear failed'));

    await expect(database.destroy()).rejects.toThrow('clear failed');

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(
      Object.prototype.hasOwnProperty.call(database.connection.client, 'acquireConnection')
    ).toBe(false);

    await database.connection.destroy();
  });

  it('removes the wrapper on destroy', async () => {
    const logger = createLogger();
    const database = createDb(logger);
    expect(
      Object.prototype.hasOwnProperty.call(database.connection.client, 'acquireConnection')
    ).toBe(true);

    await database.destroy();

    expect(
      Object.prototype.hasOwnProperty.call(database.connection.client, 'acquireConnection')
    ).toBe(false);
  });
});
