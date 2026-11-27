import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { Database } from '..';

// The SQLite dialect resolves the filename to an absolute path, so use a real temporary file
const tempDbFile = () =>
  path.join(
    os.tmpdir(),
    `strapi-abort-reads-setting-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const createSqliteDb = (settings: Record<string, unknown> = {}) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
    },
    settings: { migrations: { dir: os.tmpdir() }, ...settings },
    logger: silentLogger,
  });

describe('settings.abortReadsOnRequestDisconnect', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  describe('validation', () => {
    it.each([
      ['true', 'received "true"'],
      ['false', 'received "false"'],
      [1, 'received 1'],
      [0, 'received 0'],
      [null, 'received null'],
      [{}, 'received [object Object]'],
    ])('refuses %j (%s)', (abortReadsOnRequestDisconnect, received) => {
      expect(() => createSqliteDb({ abortReadsOnRequestDisconnect })).toThrow(
        /Invalid database setting "abortReadsOnRequestDisconnect": expected a boolean/
      );
      expect(() => createSqliteDb({ abortReadsOnRequestDisconnect })).toThrow(received);
    });

    it('points at env.bool() for values read from the environment', () => {
      expect(() => createSqliteDb({ abortReadsOnRequestDisconnect: 'true' })).toThrow(
        'Use env.bool() when reading it from an environment variable.'
      );
    });

    it.each([[true], [false]])('accepts %j', (abortReadsOnRequestDisconnect) => {
      db = createSqliteDb({ abortReadsOnRequestDisconnect });

      expect(db.config.settings.abortReadsOnRequestDisconnect).toBe(abortReadsOnRequestDisconnect);
    });

    it('accepts the setting being left out (off)', () => {
      db = createSqliteDb();

      expect(db.config.settings.abortReadsOnRequestDisconnect).toBeUndefined();
    });
  });
});
