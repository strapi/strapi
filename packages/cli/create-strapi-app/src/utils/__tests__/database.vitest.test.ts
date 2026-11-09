import { describe, expect, it } from 'vitest';

import {
  addDatabaseDependencies,
  BETTER_SQLITE3_NODE_22_13_VERSION,
  BETTER_SQLITE3_VERSION,
  getDatabaseInfos,
} from '../database';
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
  it('pins better-sqlite3 from the Node version, not the test runner', () => {
    const node22WithoutNapi = dependencyScope('sqlite');
    const node23WithoutNapi = dependencyScope('sqlite');
    const node22WithNapi = dependencyScope('sqlite');
    const node23WithNapi = dependencyScope('sqlite');

    addDatabaseDependencies(node22WithoutNapi, '22.13.0');
    addDatabaseDependencies(node23WithoutNapi, '23.5.0');
    addDatabaseDependencies(node22WithNapi, '22.14.0');
    addDatabaseDependencies(node23WithNapi, '23.6.0');

    expect(node22WithoutNapi.dependencies?.['better-sqlite3']).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(node23WithoutNapi.dependencies?.['better-sqlite3']).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(node22WithNapi.dependencies?.['better-sqlite3']).toBe(BETTER_SQLITE3_VERSION);
    expect(node23WithNapi.dependencies?.['better-sqlite3']).toBe(BETTER_SQLITE3_VERSION);
  });

  it('pins 12.11.1 when the recorded package manager is Yarn 1', () => {
    const yarn1 = dependencyScope('sqlite');
    yarn1.packageManager = 'yarn';
    yarn1.yarnVersion = '1.22.22';

    const yarn4 = dependencyScope('sqlite');
    yarn4.packageManager = 'yarn';
    yarn4.yarnVersion = '4.12.0';

    const npmWithStrayYarnVersion = dependencyScope('sqlite');
    npmWithStrayYarnVersion.yarnVersion = '1.22.22';

    addDatabaseDependencies(yarn1, '24.0.0');
    addDatabaseDependencies(yarn4, '24.0.0');
    addDatabaseDependencies(npmWithStrayYarnVersion, '24.0.0');

    expect(yarn1.dependencies?.['better-sqlite3']).toBe(BETTER_SQLITE3_NODE_22_13_VERSION);
    expect(yarn4.dependencies?.['better-sqlite3']).toBe(BETTER_SQLITE3_VERSION);
    expect(npmWithStrayYarnVersion.dependencies?.['better-sqlite3']).toBe(BETTER_SQLITE3_VERSION);
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
