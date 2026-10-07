import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { Database } from '..';

const dbFile = path.join(
  os.tmpdir(),
  `strapi-connection-password-${process.pid}-${Math.random().toString(36).slice(2)}.db`
);

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    rmSync(`${dbFile}${suffix}`, { force: true });
  }
});

describe('database password visibility', () => {
  it('keeps the password out of the enumerable keys of the config it was given', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const config = {
      connection: {
        client: 'sqlite' as const,
        connection: { filename: dbFile, password: 'p' },
        useNullAsDefault: true,
        pool: { min: 0, max: 1 },
      },
      settings: { migrations: { dir: os.tmpdir() } },
      logger,
    };

    const db = new Database(config);

    try {
      const connection = config.connection.connection;

      expect(Object.keys(connection)).not.toContain('password');
      expect(JSON.stringify(config)).not.toContain('"password"');
      expect(connection.password).toBe('p');
    } finally {
      await db.destroy();
    }
  });
});
