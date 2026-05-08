'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');

function composeEnv(ctx, extra = {}) {
  const composeProject = process.env.STRAPI_MIGRATION_COMPOSE_PROJECT || 'strapi_migration_v5';
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME: composeProject,
    ...extra,
  };
}

async function dockerComposeDownVolumes(ctx) {
  // Use the auto-detected compose runtime via execFileSync (no shell). This avoids
  // CodeQL's "Shell command built from environment values" warning that fires when
  // an absolute path is template-interpolated into an execSync shell string, and
  // matches what examples/complex/scripts/db-*.js use.
  const { runCompose } = require(path.join(ctx.COMPLEX_DIR, 'scripts', 'compose'));
  try {
    runCompose(['-f', ctx.DOCKER_COMPOSE_FILE, 'down', '-v'], {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'pipe',
      env: composeEnv(ctx),
    });
  } catch {
    // No project / already clean
  }
}

async function resolveDockerHostPorts(client) {
  const getPort = require('get-port');

  if (client === 'postgres') {
    if (!process.env.POSTGRES_PORT && !process.env.DATABASE_PORT) {
      const p = await getPort({ port: 5432 });
      process.env.POSTGRES_PORT = String(p);
      process.env.DATABASE_PORT = String(p);
      console.log(
        `\n🔌 Using host port ${p} for Postgres → container 5432 (set POSTGRES_PORT or DATABASE_PORT to pin).`
      );
    } else if (!process.env.POSTGRES_PORT && process.env.DATABASE_PORT) {
      process.env.POSTGRES_PORT = process.env.DATABASE_PORT;
    } else if (process.env.POSTGRES_PORT && !process.env.DATABASE_PORT) {
      process.env.DATABASE_PORT = process.env.POSTGRES_PORT;
    }
    return;
  }

  if (client === 'mysql') {
    if (!process.env.MYSQL_PORT && !process.env.DATABASE_PORT) {
      const p = await getPort({ port: 3306 });
      process.env.MYSQL_PORT = String(p);
      process.env.DATABASE_PORT = String(p);
      console.log(
        `\n🔌 Using host port ${p} for MySQL → container 3306 (set MYSQL_PORT or DATABASE_PORT to pin).`
      );
    } else if (!process.env.MYSQL_PORT && process.env.DATABASE_PORT) {
      process.env.MYSQL_PORT = process.env.DATABASE_PORT;
    } else if (process.env.MYSQL_PORT && !process.env.DATABASE_PORT) {
      process.env.DATABASE_PORT = process.env.MYSQL_PORT;
    }
  }

  if (client === 'mariadb') {
    if (!process.env.MARIADB_PORT && !process.env.DATABASE_PORT) {
      const p = await getPort({ port: 3307 });
      process.env.MARIADB_PORT = String(p);
      process.env.DATABASE_PORT = String(p);
      console.log(
        `\n🔌 Using host port ${p} for MariaDB → container 3306 (set MARIADB_PORT or DATABASE_PORT to pin).`
      );
    } else if (!process.env.MARIADB_PORT && process.env.DATABASE_PORT) {
      process.env.MARIADB_PORT = process.env.DATABASE_PORT;
    } else if (process.env.MARIADB_PORT && !process.env.DATABASE_PORT) {
      process.env.DATABASE_PORT = process.env.MARIADB_PORT;
    }
  }
}

function buildDatabaseEnvForClient(ctx, client) {
  const postgresPort = process.env.POSTGRES_PORT || '5432';
  const mysqlPort = process.env.MYSQL_PORT || '3306';
  const mariadbPort = process.env.MARIADB_PORT || '3307';
  // Strapi exposes postgres | mysql | sqlite only (Knex mysql2 against MariaDB uses client "mysql").
  const base = {
    DATABASE_CLIENT: client === 'mariadb' ? 'mysql' : client,
    DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
    DATABASE_NAME: process.env.DATABASE_NAME || 'strapi',
    DATABASE_USERNAME: process.env.DATABASE_USERNAME || 'strapi',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'strapi',
    DATABASE_SSL: process.env.DATABASE_SSL || 'false',
  };

  if (client === 'postgres') {
    return {
      ...base,
      DATABASE_PORT: process.env.DATABASE_PORT || postgresPort,
    };
  }
  if (client === 'mysql') {
    return {
      ...base,
      DATABASE_PORT: process.env.DATABASE_PORT || mysqlPort,
    };
  }
  if (client === 'mariadb') {
    return {
      ...base,
      DATABASE_CLIENT: 'mysql',
      DATABASE_PORT: process.env.DATABASE_PORT || mariadbPort,
    };
  }
  return {
    ...base,
    DATABASE_FILENAME: ctx.SQLITE_PATH,
  };
}

function writeV4Dotenv(ctx, dbEnv) {
  const keys = ['toBeModified1', 'toBeModified2', 'toBeModified3', 'toBeModified4'].join(',');
  let body = `HOST=0.0.0.0
PORT=1337
APP_KEYS=${keys}
API_TOKEN_SALT=toBeModified
ADMIN_JWT_SECRET=toBeModified
TRANSFER_TOKEN_SALT=toBeModified
JWT_SECRET=toBeModified
`;

  if (dbEnv.DATABASE_CLIENT === 'sqlite') {
    body += `DATABASE_CLIENT=sqlite
DATABASE_FILENAME=${dbEnv.DATABASE_FILENAME}
`;
  } else {
    body += `DATABASE_CLIENT=${dbEnv.DATABASE_CLIENT}
DATABASE_HOST=${dbEnv.DATABASE_HOST}
DATABASE_PORT=${dbEnv.DATABASE_PORT}
DATABASE_NAME=${dbEnv.DATABASE_NAME}
DATABASE_USERNAME=${dbEnv.DATABASE_USERNAME}
DATABASE_PASSWORD=${dbEnv.DATABASE_PASSWORD}
`;
  }

  fs.writeFileSync(require('path').join(ctx.V4_APP_DIR, '.env'), body);
}

async function prepareDockerDatabase(ctx, client) {
  const dbUtils = require(path.join(ctx.COMPLEX_DIR, 'scripts', 'db-utils.js'));
  const {
    startContainer,
    getContainerId,
    waitForPostgresReady,
    waitForMysqlReady,
    waitForMariadbReady,
  } = dbUtils;

  if (client === 'postgres') {
    await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'db-postgres.js'), 'wipe'], {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'inherit',
      env: composeEnv(ctx),
    });
    const cid = getContainerId(ctx.DOCKER_COMPOSE_FILE, ctx.COMPLEX_DIR, 'postgres');
    if (cid) {
      waitForPostgresReady(cid);
    }
    return;
  }

  if (client === 'mysql') {
    startContainer(ctx.DOCKER_COMPOSE_FILE, ctx.COMPLEX_DIR, 'mysql');
    const cid = getContainerId(ctx.DOCKER_COMPOSE_FILE, ctx.COMPLEX_DIR, 'mysql');
    if (cid) {
      waitForMysqlReady(cid);
    }
    await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'db-mysql.js'), 'wipe'], {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'inherit',
      env: composeEnv(ctx),
    });
  }

  if (client === 'mariadb') {
    startContainer(ctx.DOCKER_COMPOSE_FILE, ctx.COMPLEX_DIR, 'mariadb');
    const cid = getContainerId(ctx.DOCKER_COMPOSE_FILE, ctx.COMPLEX_DIR, 'mariadb');
    if (cid) {
      waitForMariadbReady(cid);
    }
    await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'db-mariadb.js'), 'wipe'], {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'inherit',
      env: composeEnv(ctx),
    });
  }
}

function assertNodeForV4() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major > 20) {
    console.warn(
      `\n⚠️  Strapi v4 in this scaffold expects Node <= 20 (engines). Current Node is ${process.version}. If install or seed fails, use Node 20.\n`
    );
  }
}

async function runWorkspaceBuilds(repoRoot, { fullBuild, skipBuild }) {
  const fs = require('fs');

  if (fullBuild) {
    console.log('\n📦 Running yarn build at repo root (first step)...');
    await execa('yarn', ['build'], { cwd: repoRoot, stdio: 'inherit' });
    return;
  }
  if (!skipBuild) {
    const strapiPkg = require('path').join(repoRoot, 'packages', 'core', 'strapi', 'package.json');
    const databasePkg = require('path').join(
      repoRoot,
      'packages',
      'core',
      'database',
      'package.json'
    );
    if (!fs.existsSync(strapiPkg)) {
      console.error('Missing @strapi/strapi package; run from a full checkout.');
      process.exit(1);
    }
    if (!fs.existsSync(databasePkg)) {
      console.error('Missing @strapi/database package; run from a full checkout.');
      process.exit(1);
    }
    console.log(
      '\n📦 Building @strapi/core and @strapi/database (migration dist). Use --skip-build to skip.'
    );
    await execa('yarn', ['workspace', '@strapi/core', 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    await execa('yarn', ['workspace', '@strapi/database', 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } else {
    console.log(
      '\n⚠️  --skip-build: tests load compiled code from `packages/core/core/dist` and `packages/core/database/dist`; rebuild those workspaces after editing migration TS if results look stale.'
    );
  }
}

module.exports = {
  composeEnv,
  dockerComposeDownVolumes,
  resolveDockerHostPorts,
  buildDatabaseEnvForClient,
  writeV4Dotenv,
  prepareDockerDatabase,
  assertNodeForV4,
  runWorkspaceBuilds,
};
