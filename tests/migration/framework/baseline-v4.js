'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');

/**
 * Scaffold v4 app, prepare DB, install, seed (same DB the later stages use).
 *
 * @param {object} ctx
 * @param {{ database: string, multiplier: number, dbEnv: Record<string, string>, initialVersion?: string }} opts
 */
async function runV4Baseline(ctx, opts) {
  const { database, multiplier, dbEnv, initialVersion = 'legacy' } = opts;

  console.log('\n📁 Scaffolding Strapi v4 app...');
  await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-v4-project.js')], {
    cwd: ctx.REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      V4_OUTSIDE_DIR: ctx.V4_APP_DIR,
      STRAPI_V4_VERSION: initialVersion,
    },
  });

  const { writeAppDotenv, prepareDockerDatabase, nestedYarnInstallEnv } = require('./shared');
  writeAppDotenv(ctx, dbEnv);

  if (database === 'sqlite') {
    fs.mkdirSync(path.join(ctx.V4_APP_DIR, '.tmp'), { recursive: true });
    if (fs.existsSync(ctx.SQLITE_PATH)) {
      fs.unlinkSync(ctx.SQLITE_PATH);
    }
  } else {
    await prepareDockerDatabase(ctx, database);
  }

  // Empty lockfile marks this directory as a standalone Yarn project (not a monorepo workspace).
  fs.writeFileSync(path.join(ctx.V4_APP_DIR, 'yarn.lock'), '');

  console.log('\n📦 yarn install (v4 app)...');
  await execa('yarn', ['install'], {
    cwd: ctx.V4_APP_DIR,
    stdio: 'inherit',
    env: nestedYarnInstallEnv(dbEnv),
  });

  console.log('\n🌱 Seeding v4 database...');
  await execa('node', [path.join('scripts', 'seed.js'), '--multiplier', String(multiplier)], {
    cwd: ctx.V4_APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...dbEnv, SEED_MULTIPLIER: String(multiplier) },
  });

  return dbEnv;
}

module.exports = { runV4Baseline };
