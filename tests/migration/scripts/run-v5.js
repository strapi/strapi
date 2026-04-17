#!/usr/bin/env node
'use strict';

/**
 * v4 → v5 migration test: wipe state, scaffold pinned Strapi v4, seed, run validate-migration
 * against the same DB from examples/complex (workspace Strapi v5).
 *
 * Usage (repo root): yarn test:migrations:v5 [--database postgres|mysql|sqlite] [--multiplier N] [--build] [--skip-build]
 *
 * Before v4 scaffold or DB work, by default runs `yarn workspace @strapi/core build` and
 * `yarn workspace @strapi/database build` so discard-drafts (core) and internal DB migrations
 * (database package) match source. Use `--skip-build` only when both dists are current.
 * `--build` runs the full monorepo `yarn build` instead.
 *
 * Layout: `tests/migration/v5/` (env), `tests/migration/scripts/` (runners). Add `v6/` alongside when needed.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const { rimraf } = require('rimraf');
const execa = require('execa');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const COMPLEX_DIR = path.join(REPO_ROOT, 'examples', 'complex');
const MIGRATION_ROOT = path.join(COMPLEX_DIR, '.migration-v5');
const V4_APP_DIR = path.join(MIGRATION_ROOT, 'v4-app');
const SQLITE_PATH = path.join(MIGRATION_ROOT, 'migration.sqlite');
const DOCKER_COMPOSE_FILE = path.join(COMPLEX_DIR, 'docker-compose.dev.yml');
const DOTENV_PATH = path.join(REPO_ROOT, 'tests', 'migration', 'v5', '.env');

if (fs.existsSync(DOTENV_PATH)) {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: DOTENV_PATH });
}

/**
 * When POSTGRES_PORT / MYSQL_PORT (and DATABASE_PORT) are unset, pick a free host port
 * (preferring 5432 / 3306) so local dev machines with Postgres already on 5432 still work.
 */
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
}

const argv = yargs(hideBin(process.argv))
  .option('database', {
    alias: 'd',
    type: 'string',
    choices: ['postgres', 'mysql', 'sqlite'],
    describe: 'Database engine for v4 seed and v5 validation',
  })
  .option('multiplier', {
    alias: 'm',
    type: 'number',
    default: 1,
    describe: 'Seed / validation count multiplier',
  })
  .option('build', {
    type: 'boolean',
    default: false,
    describe: 'Run `yarn build` at repo root before testing',
  })
  .option('skip-build', {
    type: 'boolean',
    default: false,
    describe:
      'Skip `@strapi/core` + `@strapi/database` workspace builds before tests (only if dist already matches source)',
  })
  .help()
  .parse();

const database = argv.database || process.env.DATABASE_CLIENT || 'postgres';
const multiplier =
  argv.multiplier || Number(process.env.MIGRATION_MULTIPLIER || process.env.SEED_MULTIPLIER) || 1;
const composeProject = process.env.STRAPI_MIGRATION_COMPOSE_PROJECT || 'strapi_migration_v5';

function composeEnv(extra = {}) {
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME: composeProject,
    ...extra,
  };
}

async function dockerComposeDownVolumes() {
  try {
    execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down -v`, {
      cwd: COMPLEX_DIR,
      stdio: 'pipe',
      env: composeEnv(),
    });
  } catch {
    // No project / already clean
  }
}

async function cleanState() {
  console.log('\n🧹 Cleaning previous migration test state...');
  await dockerComposeDownVolumes();
  await rimraf(MIGRATION_ROOT);
}

function assertNodeForV4() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major > 20) {
    console.warn(
      `\n⚠️  Strapi v4 in this scaffold expects Node <= 20 (engines). Current Node is ${process.version}. If install or seed fails, use Node 20.\n`
    );
  }
}

function buildDatabaseEnvForClient(client) {
  const postgresPort = process.env.POSTGRES_PORT || '5432';
  const mysqlPort = process.env.MYSQL_PORT || '3306';
  const base = {
    DATABASE_CLIENT: client,
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
  return {
    ...base,
    DATABASE_FILENAME: SQLITE_PATH,
  };
}

function writeV4Dotenv(dbEnv) {
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

  fs.writeFileSync(path.join(V4_APP_DIR, '.env'), body);
}

async function prepareDockerDatabase(client) {
  const dbUtils = require(path.join(COMPLEX_DIR, 'scripts', 'db-utils.js'));
  const { startContainer, getContainerId, waitForPostgresReady, waitForMysqlReady } = dbUtils;

  if (client === 'postgres') {
    await execa('node', [path.join(COMPLEX_DIR, 'scripts', 'db-postgres.js'), 'wipe'], {
      cwd: COMPLEX_DIR,
      stdio: 'inherit',
      env: composeEnv(),
    });
    const cid = getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'postgres');
    if (cid) {
      waitForPostgresReady(cid);
    }
    return;
  }

  if (client === 'mysql') {
    startContainer(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'mysql');
    const cid = getContainerId(DOCKER_COMPOSE_FILE, COMPLEX_DIR, 'mysql');
    if (cid) {
      waitForMysqlReady(cid);
    }
    await execa('node', [path.join(COMPLEX_DIR, 'scripts', 'db-mysql.js'), 'wipe'], {
      cwd: COMPLEX_DIR,
      stdio: 'inherit',
      env: composeEnv(),
    });
  }
}

async function run() {
  // Build first — before Node version check, scaffold, or DB work — so `examples/complex` loads current dist.
  if (argv.build) {
    console.log('\n📦 Running yarn build at repo root (first step)...');
    await execa('yarn', ['build'], { cwd: REPO_ROOT, stdio: 'inherit' });
  } else if (!argv.skipBuild) {
    const strapiPkg = path.join(REPO_ROOT, 'packages', 'core', 'strapi', 'package.json');
    const databasePkg = path.join(REPO_ROOT, 'packages', 'core', 'database', 'package.json');
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
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
    await execa('yarn', ['workspace', '@strapi/database', 'build'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  } else {
    console.log(
      '\n⚠️  --skip-build: tests load compiled code from `packages/core/core/dist` and `packages/core/database/dist`; rebuild those workspaces after editing migration TS if results look stale.'
    );
  }

  assertNodeForV4();

  console.log(
    `\n📌 Migration test: database=${database}, multiplier=${multiplier}, compose=${composeProject}`
  );

  if (database === 'postgres' || database === 'mysql') {
    await resolveDockerHostPorts(database);
  }

  await cleanState();

  const dbEnv = buildDatabaseEnvForClient(database);

  console.log('\n📁 Scaffolding Strapi v4 app...');
  await execa('node', [path.join(COMPLEX_DIR, 'scripts', 'setup-v4-project.js')], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      V4_OUTSIDE_DIR: V4_APP_DIR,
    },
  });

  writeV4Dotenv(dbEnv);

  if (database === 'sqlite') {
    fs.mkdirSync(path.join(V4_APP_DIR, '.tmp'), { recursive: true });
    if (fs.existsSync(SQLITE_PATH)) {
      fs.unlinkSync(SQLITE_PATH);
    }
  } else {
    await prepareDockerDatabase(database);
  }

  // Yarn 4 requires an empty yarn.lock for a nested dir outside workspaces (see tests/helpers/test-app.js)
  fs.writeFileSync(path.join(V4_APP_DIR, 'yarn.lock'), '');

  console.log('\n📦 yarn install (v4 app)...');
  await execa('yarn', ['install'], {
    cwd: V4_APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...dbEnv },
  });

  console.log('\n🌱 Seeding v4 database...');
  await execa('node', [path.join('scripts', 'seed.js'), '--multiplier', String(multiplier)], {
    cwd: V4_APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...dbEnv, SEED_MULTIPLIER: String(multiplier) },
  });

  const validateEnv = {
    ...process.env,
    ...dbEnv,
    MIGRATION_MULTIPLIER: String(multiplier),
    SEED_MULTIPLIER: String(multiplier),
  };

  console.log('\n✅ Running v5 migration validation (boots Strapi from examples/complex)...');
  await execa(
    'node',
    [path.join('scripts', 'validate-migration.js'), '--multiplier', String(multiplier)],
    {
      cwd: COMPLEX_DIR,
      stdio: 'inherit',
      env: validateEnv,
    }
  );

  console.log('\n✅ test:migrations:v5 completed successfully.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
