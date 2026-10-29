import { defineConfig, defineDatabaseConfig, defineServerConfig } from '../config';

describe('config factories', () => {
  describe('defineDatabaseConfig', () => {
    it('accepts a valid sqlite config', () => {
      const cfg = defineDatabaseConfig({
        connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
      });
      expect(cfg.connection.client).toBe('sqlite');
    });

    it('throws a clear error when client is missing', () => {
      expect(() =>
        // @ts-expect-error testing validation
        defineDatabaseConfig({ connection: { connection: {} } })
      ).toThrow(/Invalid `database` config/);
    });

    it('throws a clear error on an unsupported client', () => {
      expect(() =>
        defineDatabaseConfig({
          // @ts-expect-error testing validation
          connection: { client: 'oracle', connection: {} },
        })
      ).toThrow(/Invalid `database` config/);
    });
  });

  describe('defineServerConfig', () => {
    it('accepts a valid server config', () => {
      const cfg = defineServerConfig({ host: '0.0.0.0', port: 1337 });
      expect(cfg.port).toBe(1337);
    });

    it('throws when port is not a number', () => {
      expect(() =>
        // @ts-expect-error testing validation
        defineServerConfig({ port: 'abc' })
      ).toThrow(/Invalid `server` config/);
    });
  });

  describe('defineConfig', () => {
    it('returns the config untouched when valid', () => {
      const cfg = defineConfig({
        database: { connection: { client: 'sqlite', connection: { filename: ':memory:' } } },
        custom: { anything: true },
      });
      expect(cfg.custom).toEqual({ anything: true });
    });

    it('validates the database domain when present', () => {
      expect(() =>
        defineConfig({
          // @ts-expect-error testing validation
          database: { connection: {} },
        })
      ).toThrow(/Invalid `database` config/);
    });

    it('passes through with no database/server', () => {
      expect(defineConfig({ admin: { autoOpen: false } })).toEqual({
        admin: { autoOpen: false },
      });
    });
  });
});
