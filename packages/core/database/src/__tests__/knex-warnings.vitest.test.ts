import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Knex } from 'knex';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { Database } from '..';

interface PoolClient {
  acquireConnection(): Promise<unknown>;
  releaseConnection(connection: unknown): Promise<unknown>;
}

const tempDbFiles: string[] = [];

const tempDbFile = () => {
  const file = path.join(
    os.tmpdir(),
    `strapi-knex-log-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );
  tempDbFiles.push(file);
  return file;
};

afterAll(() => {
  for (const file of tempDbFiles) {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      rmSync(`${file}${suffix}`, { force: true });
    }
  }
});

const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

const createDb = (logger: ReturnType<typeof createLogger>, log?: Knex.Logger) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 100,
      ...(log ? { log } : {}),
    },
    settings: { migrations: { dir: os.tmpdir() } },
    logger,
  });

const timeoutsWhilePoolIsHeld = async (db: Database, count: number) => {
  const client = db.connection.client as unknown as PoolClient;
  const held = await client.acquireConnection();

  try {
    return await Promise.allSettled(
      Array.from({ length: count }, () => db.connection.raw('select 1'))
    );
  } finally {
    await client.releaseConnection(held);
  }
};

describe('knex warnings', () => {
  it('logs one acquire warning through the Strapi logger for a burst of pool timeouts', async () => {
    const logger = createLogger();
    const db = createDb(logger);

    try {
      const results = await timeoutsWhilePoolIsHeld(db, 5);

      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      // knex 3.3 keeps tarn's error as the cause of the one it throws (knex #5681)
      expect((results[0] as PromiseRejectedResult).reason.cause.message).toBe(
        'operation timed out for an unknown reason'
      );
      const acquireWarnings = logger.warn.mock.calls.filter(([message]) =>
        String(message).startsWith('[database] knex: Acquire connection error:')
      );
      expect(acquireWarnings).toHaveLength(1);
    } finally {
      await db.destroy();
    }
  });

  it('leaves a warn function configured by the project in place', async () => {
    const logger = createLogger();
    const projectWarn = vi.fn();
    const db = createDb(logger, { warn: projectWarn });

    try {
      await timeoutsWhilePoolIsHeld(db, 2);

      expect(projectWarn).toHaveBeenCalled();
      const routed = logger.warn.mock.calls.filter(([message]) =>
        String(message).startsWith('[database] knex:')
      );
      expect(routed).toHaveLength(0);
    } finally {
      await db.destroy();
    }
  });
});
