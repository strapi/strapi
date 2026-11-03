import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { Database } from '..';

interface PoolClient {
  acquireConnection(): Promise<unknown>;
  releaseConnection(connection: unknown): Promise<unknown>;
}

// The SQLite dialect resolves the filename to an absolute path, so use a real temporary file
const tempDbFile = () =>
  path.join(
    os.tmpdir(),
    `strapi-trx-stack-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const createDb = () =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 200,
    },
    settings: { migrations: { dir: os.tmpdir() } },
    logger: silentLogger,
  });

async function startTransactionFromCaller(db: Database) {
  const result = await db.transaction(async () => 'unreachable');
  return result;
}

describe('Database#transaction stack traces', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  it('reports the code that waited for the transaction when the pool times out', async () => {
    db = createDb();
    const client = db.connection.client as unknown as PoolClient;
    const held = await client.acquireConnection();

    try {
      const error = (await startTransactionFromCaller(db).catch((e: Error) => e)) as Error;

      expect(error.name).toBe('KnexTimeoutError');
      expect(error.stack?.split('\n')[1]).toContain('acquireConnection');
      expect(error.stack).toContain('startTransactionFromCaller');
    } finally {
      await client.releaseConnection(held);
    }
  });

  it('still runs a transaction normally', async () => {
    db = createDb();

    await expect(db.transaction(async () => 'done')).resolves.toBe('done');
  });
});
