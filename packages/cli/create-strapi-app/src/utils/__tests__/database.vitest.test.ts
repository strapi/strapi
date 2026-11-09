import { describe, expect, it } from 'vitest';

import { addDatabaseDependencies, getBetterSqlite3Version, getDatabaseInfos } from '../database';
import { generateDotEnv } from '../dot-env';

import type { Options, Scope } from '../../types';

const getDotEnvFilename = async (options: Options) => {
  const database = await getDatabaseInfos(options);
  const dotEnv = generateDotEnv({ database } as Scope);

  return dotEnv.match(/^DATABASE_FILENAME=(.*)$/m)?.[1];
};

const dependencyScope = (client: Scope['database']['client']): Scope => ({
  name: 'App',
  rootPath: '/tmp/app',
  packageManager: 'npm',
  database: { client },
  dependencies: {},
  shouldCreateGrowthSsoTrial: false,
  invocation: 'unknown',
  agentName: null,
});

describe('addDatabaseDependencies', () => {
  it('pins better-sqlite3 when the app uses sqlite', () => {
    const scope = dependencyScope('sqlite');

    addDatabaseDependencies(scope);

    expect(scope.dependencies?.['better-sqlite3']).toBe(getBetterSqlite3Version());
  });

  it('pins the client package when the app does not use sqlite', () => {
    const postgres = dependencyScope('postgres');
    const mysql = dependencyScope('mysql');

    addDatabaseDependencies(postgres);
    addDatabaseDependencies(mysql);

    expect(postgres.dependencies).toMatchObject({ pg: '8.20.0' });
    expect(postgres.dependencies?.['better-sqlite3']).toBeUndefined();
    expect(mysql.dependencies).toMatchObject({ mysql2: '3.20.0' });
  });
});

describe('getDatabaseInfos', () => {
  it('uses the default sqlite file in non-interactive mode without database options', async () => {
    await expect(getDotEnvFilename({ nonInteractive: true })).resolves.toBe('.tmp/data.db');
  });

  it('uses the default sqlite file when --dbclient sqlite is passed without --dbfile', async () => {
    await expect(getDotEnvFilename({ nonInteractive: true, dbclient: 'sqlite' })).resolves.toBe(
      '.tmp/data.db'
    );
  });

  it('keeps the --dbfile value when it is passed with --dbclient sqlite', async () => {
    await expect(
      getDotEnvFilename({ nonInteractive: true, dbclient: 'sqlite', dbfile: 'db/custom.db' })
    ).resolves.toBe('db/custom.db');
  });
});
