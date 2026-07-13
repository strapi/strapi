import { buildReaderConfig, createReadReplicaConnection } from '../connection';
import type { ConnectionConfig } from '../connection';

const writerConfig: ConnectionConfig = {
  client: 'postgres',
  connection: {
    host: 'writer.example.com',
    port: 5432,
    database: 'strapi',
    user: 'strapi',
    password: 'secret',
    ssl: false,
  },
  pool: { min: 2, max: 10 },
};

describe('buildReaderConfig', () => {
  it('returns undefined when no readReplica is configured', () => {
    expect(buildReaderConfig(writerConfig)).toBeUndefined();
  });

  it('inherits client, credentials and pool from the writer', () => {
    const reader = buildReaderConfig({
      ...writerConfig,
      readReplica: { connection: { host: 'reader.example.com' } },
    });

    expect(reader).toBeDefined();
    expect(reader!.client).toBe('postgres');
    expect(reader!.pool).toEqual({ min: 2, max: 10 });
    expect(reader!.connection).toMatchObject({
      host: 'reader.example.com', // overridden
      port: 5432, // inherited
      database: 'strapi', // inherited
      user: 'strapi', // inherited
      password: 'secret', // inherited
      ssl: false, // inherited
    });
  });

  it('does not mutate the original writer connection', () => {
    const config: ConnectionConfig = {
      ...writerConfig,
      connection: { ...(writerConfig.connection as object) },
      readReplica: { connection: { host: 'reader.example.com' } },
    };
    buildReaderConfig(config);
    expect((config.connection as any).host).toBe('writer.example.com');
  });

  it('lets the replica override pool settings', () => {
    const reader = buildReaderConfig({
      ...writerConfig,
      readReplica: {
        connection: { host: 'reader.example.com' },
        pool: { min: 5, max: 30 },
      },
    });
    expect(reader!.pool).toEqual({ min: 5, max: 30 });
  });

  it('does not leak the readReplica key into the reader config', () => {
    const reader = buildReaderConfig({
      ...writerConfig,
      readReplica: { connection: { host: 'reader.example.com' } },
    });
    expect(reader).not.toHaveProperty('readReplica');
  });

  it('throws when the writer uses a connection string but the replica override is a partial object', () => {
    expect(() =>
      buildReaderConfig({
        client: 'postgres',
        connection: 'postgres://u:p@writer.example.com:5432/strapi',
        readReplica: { connection: { host: 'reader.example.com' } },
      })
    ).toThrow(/connection string/i);
  });

  it('allows a full connection-string replica when the writer uses a connection string', () => {
    const reader = buildReaderConfig({
      client: 'postgres',
      connection: 'postgres://u:p@writer.example.com:5432/strapi',
      readReplica: { connection: 'postgres://u:p@reader.example.com:5432/strapi' },
    });
    expect(reader!.connection).toBe('postgres://u:p@reader.example.com:5432/strapi');
  });

  it('lets the replica override credentials (separate reader user)', () => {
    const reader = buildReaderConfig({
      ...writerConfig,
      readReplica: {
        connection: { host: 'reader.example.com', user: 'readonly', password: 'ro-secret' },
      },
    });
    expect(reader!.connection).toMatchObject({
      host: 'reader.example.com',
      user: 'readonly',
      password: 'ro-secret',
      database: 'strapi',
    });
  });
});

describe('createReadReplicaConnection', () => {
  it('returns undefined when no readReplica is configured', () => {
    expect(createReadReplicaConnection(writerConfig)).toBeUndefined();
  });

  it('throws for the sqlite client, which has no reader endpoint', () => {
    expect(() =>
      createReadReplicaConnection({
        client: 'sqlite',
        connection: { filename: 'writer.db' },
        readReplica: { connection: { filename: 'reader.db' } },
      })
    ).toThrow(/sqlite/i);
  });

  it('creates a knex instance pointed at the reader host', () => {
    const reader = createReadReplicaConnection({
      ...writerConfig,
      readReplica: { connection: { host: 'reader.example.com' } },
    });

    expect(reader).toBeDefined();
    expect(reader!.client.connectionSettings.host).toBe('reader.example.com');
    // sanity: the writer host is not used
    expect(reader!.client.connectionSettings.host).not.toBe('writer.example.com');

    return reader!.destroy();
  });
});
