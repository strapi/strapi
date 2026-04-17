#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { runCompose, runContainer } = require('./compose');

const COMPOSE_PROJECT_NAME = process.env.COMPOSE_PROJECT_NAME || 'strapi_complex';

function getComposeEnv() {
  return { ...process.env, COMPOSE_PROJECT_NAME };
}

function getContainerId(composeFile, cwd, serviceName) {
  // Try compose ps -q first (works with docker-compose and docker compose v2).
  try {
    const output = runCompose(['-f', composeFile, 'ps', '-q', serviceName], {
      cwd,
      env: getComposeEnv(),
    }).trim();
    if (output) return output.split('\n')[0];
  } catch (error) {
    // Fall through to runtime-level lookup — podman-compose doesn't support `-q`.
  }

  // Fallback: use `<runtime> ps --filter name=<project>_<service>` via the container CLI.
  // docker-compose v1 names containers `<project>_<service>_<index>`; v2 uses
  // `<project>-<service>-<index>`. We filter on both separators to be safe.
  try {
    const underscored = runContainer([
      'ps',
      '-a',
      '--filter',
      `name=${COMPOSE_PROJECT_NAME}_${serviceName}`,
      '--format',
      '{{.ID}}',
    ]).trim();
    if (underscored) return underscored.split('\n')[0];

    const hyphenated = runContainer([
      'ps',
      '-a',
      '--filter',
      `name=${COMPOSE_PROJECT_NAME}-${serviceName}`,
      '--format',
      '{{.ID}}',
    ]).trim();
    if (hyphenated) return hyphenated.split('\n')[0];
  } catch (error) {
    // Swallow — caller treats null as "not running".
  }

  return null;
}

function getContainerName(composeFile, cwd, serviceName) {
  const containerId = getContainerId(composeFile, cwd, serviceName);
  if (!containerId) return null;
  try {
    const nameOutput = runContainer(['inspect', '--format={{.Name}}', containerId]).trim();
    return nameOutput.replace(/^\//, '');
  } catch (error) {
    return null;
  }
}

function isContainerRunning(containerId) {
  if (!containerId) return false;
  try {
    const status = runContainer(['inspect', '--format={{.State.Running}}', containerId]).trim();
    return status === 'true';
  } catch (error) {
    return false;
  }
}

function startContainer(composeFile, cwd, serviceName) {
  runCompose(['-f', composeFile, 'up', '-d', serviceName], {
    cwd,
    stdio: 'inherit',
    env: getComposeEnv(),
  });
}

function waitForPostgresReady(containerId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = spawnSync(
      require('./compose').getContainerCommand(),
      ['exec', containerId, 'pg_isready', '-U', 'strapi'],
      { stdio: 'ignore' }
    );
    if (result.status === 0) return true;
  }
  return false;
}

function waitForMysqlReady(containerId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = spawnSync(
      require('./compose').getContainerCommand(),
      [
        'exec',
        containerId,
        'mysqladmin',
        'ping',
        '-h',
        '127.0.0.1',
        '-u',
        'strapi',
        '-pstrapi',
        '--silent',
      ],
      { stdio: 'ignore' }
    );
    if (result.status === 0) return true;
  }
  return false;
}

function assertPostgresReady(containerId) {
  if (!containerId) {
    throw new Error('Postgres container not found. Start it and try again.');
  }
  try {
    runContainer(['exec', containerId, 'pg_isready', '-U', 'strapi'], { stdio: 'ignore' });
  } catch (error) {
    throw new Error('Postgres is not ready yet. Wait for it to be ready and retry.');
  }
}

function assertMysqlReady(containerId) {
  if (!containerId) {
    throw new Error('MySQL container not found. Start it and try again.');
  }
  try {
    runContainer(
      [
        'exec',
        containerId,
        'mysqladmin',
        'ping',
        '-h',
        '127.0.0.1',
        '-u',
        'strapi',
        '-pstrapi',
        '--silent',
      ],
      { stdio: 'ignore' }
    );
  } catch (error) {
    throw new Error('MySQL is not ready yet. Wait for it to be ready and retry.');
  }
}

function assertMariadbReady(containerId) {
  if (!containerId) {
    throw new Error('MariaDB container not found. Start it and try again.');
  }
  try {
    // mariadb ships `mariadb-admin` (preferred) and keeps `mysqladmin` as a legacy alias.
    // Force TCP via -h 127.0.0.1 — the default socket path isn't populated in these images.
    runContainer(
      [
        'exec',
        containerId,
        'mariadb-admin',
        'ping',
        '-h',
        '127.0.0.1',
        '-u',
        'strapi',
        '-pstrapi',
        '--silent',
      ],
      { stdio: 'ignore' }
    );
  } catch (error) {
    // Fall back to the mysqladmin alias for older mariadb images.
    try {
      runContainer(
        [
          'exec',
          containerId,
          'mysqladmin',
          'ping',
          '-h',
          '127.0.0.1',
          '-u',
          'strapi',
          '-pstrapi',
          '--silent',
        ],
        { stdio: 'ignore' }
      );
    } catch (innerError) {
      throw new Error('MariaDB is not ready yet. Wait for it to be ready and retry.');
    }
  }
}

function waitForMariadbReady(containerId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      assertMariadbReady(containerId);
      return true;
    } catch (error) {
      // wait and retry
    }
  }
  return false;
}

function getDatabaseEnv(dbType) {
  const env = { ...process.env };

  if (!dbType || !['postgres', 'mysql', 'mariadb', 'sqlite'].includes(dbType)) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  if (dbType === 'sqlite') {
    env.DATABASE_CLIENT = 'sqlite';
    env.DATABASE_FILENAME = env.DATABASE_FILENAME || '.tmp/data.db';
    return env;
  }

  const postgresPort = env.POSTGRES_PORT || '5432';
  const mysqlPort = env.MYSQL_PORT || '3306';
  const mariadbPort = env.MARIADB_PORT || '3307';
  const portByDialect = {
    postgres: postgresPort,
    mysql: mysqlPort,
    mariadb: mariadbPort,
  };
  const databasePort = env.DATABASE_PORT || portByDialect[dbType];

  // MariaDB uses the `mysql` knex client (wire-compatible) — connection-time detail.
  env.DATABASE_CLIENT = dbType === 'postgres' ? 'postgres' : 'mysql';
  env.DATABASE_HOST = env.DATABASE_HOST || 'localhost';
  env.DATABASE_PORT = databasePort;
  env.DATABASE_NAME = env.DATABASE_NAME || 'strapi';
  env.DATABASE_USERNAME = env.DATABASE_USERNAME || 'strapi';
  env.DATABASE_PASSWORD = env.DATABASE_PASSWORD || 'strapi';
  env.DATABASE_SSL = env.DATABASE_SSL || 'false';

  return env;
}

module.exports = {
  COMPOSE_PROJECT_NAME,
  getComposeEnv,
  getContainerId,
  getContainerName,
  isContainerRunning,
  startContainer,
  waitForPostgresReady,
  waitForMysqlReady,
  waitForMariadbReady,
  assertPostgresReady,
  assertMysqlReady,
  assertMariadbReady,
  getDatabaseEnv,
};
