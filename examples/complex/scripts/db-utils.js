#!/usr/bin/env node

const { execFileSync } = require('child_process');

const COMPOSE_PROJECT_NAME = process.env.COMPOSE_PROJECT_NAME || 'strapi_complex';

function getComposeEnv() {
  return { ...process.env, COMPOSE_PROJECT_NAME };
}

function getContainerId(composeFile, cwd, serviceName) {
  try {
    const output = execFileSync('docker-compose', ['-f', composeFile, 'ps', '-q', serviceName], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      env: getComposeEnv(),
    }).trim();
    if (!output) return null;
    return output.split('\n')[0];
  } catch (error) {
    return null;
  }
}

function getContainerName(composeFile, cwd, serviceName) {
  const containerId = getContainerId(composeFile, cwd, serviceName);
  if (!containerId) return null;
  try {
    const nameOutput = execFileSync('docker', ['inspect', '--format={{.Name}}', containerId], {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    return nameOutput.replace(/^\//, '');
  } catch (error) {
    return null;
  }
}

function isContainerRunning(containerId) {
  if (!containerId) return false;
  try {
    const status = execFileSync('docker', ['inspect', '--format={{.State.Running}}', containerId], {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    return status === 'true';
  } catch (error) {
    return false;
  }
}

function startContainer(composeFile, cwd, serviceName) {
  execFileSync('docker-compose', ['-f', composeFile, 'up', '-d', serviceName], {
    cwd,
    stdio: 'inherit',
    env: getComposeEnv(),
  });
}

function waitForPostgresReady(containerId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      execFileSync('docker', ['exec', containerId, 'pg_isready', '-U', 'strapi'], {
        stdio: 'ignore',
      });
      return true;
    } catch (error) {
      // wait and retry
    }
  }
  return false;
}

function waitForMysqlReady(containerId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      execFileSync(
        'docker',
        ['exec', containerId, 'mysqladmin', 'ping', '-u', 'strapi', '-pstrapi', '--silent'],
        {
          stdio: 'ignore',
        }
      );
      return true;
    } catch (error) {
      // wait and retry
    }
  }
  return false;
}

function assertPostgresReady(containerId) {
  if (!containerId) {
    throw new Error('Postgres container not found. Start it and try again.');
  }
  try {
    execFileSync('docker', ['exec', containerId, 'pg_isready', '-U', 'strapi'], {
      stdio: 'ignore',
    });
  } catch (error) {
    throw new Error('Postgres is not ready yet. Wait for it to be ready and retry.');
  }
}

function assertMysqlReady(containerId) {
  if (!containerId) {
    throw new Error('MySQL container not found. Start it and try again.');
  }
  try {
    execFileSync(
      'docker',
      ['exec', containerId, 'mysqladmin', 'ping', '-u', 'strapi', '-pstrapi', '--silent'],
      {
        stdio: 'ignore',
      }
    );
  } catch (error) {
    throw new Error('MySQL is not ready yet. Wait for it to be ready and retry.');
  }
}

function getDatabaseEnv(dbType) {
  const env = { ...process.env };

  if (!dbType || !['postgres', 'mysql'].includes(dbType)) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  const postgresPort = env.POSTGRES_PORT || '5432';
  const mysqlPort = env.MYSQL_PORT || '3306';
  const databasePort = env.DATABASE_PORT || (dbType === 'postgres' ? postgresPort : mysqlPort);

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
  assertPostgresReady,
  assertMysqlReady,
  getDatabaseEnv,
};
