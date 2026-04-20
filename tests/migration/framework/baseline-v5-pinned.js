'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');

/**
 * Pinned published Strapi v5 at `initialVersion` + same DB as the rest of the run + canonical v5 seed (seed-v5.js).
 * Used when baseline.type is "v5-pinned" (no v4 step).
 *
 * @param {object} ctx
 * @param {{ database: string, multiplier: number, dbEnv: Record<string, string>, initialVersion: string }} opts
 */
async function runV5PinnedBaseline(ctx, opts) {
  const { database, multiplier, dbEnv, initialVersion } = opts;
  const pinnedRoot = path.join(ctx.MIGRATION_ROOT, 'v5-baseline', initialVersion);

  console.log(
    `\n📁 Pinned Strapi v5 baseline ${initialVersion} (canonical v5 seed) at ${pinnedRoot}...`
  );
  await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-pinned-v5-project.js')], {
    cwd: ctx.REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      PINNED_STRAPI_VERSION: initialVersion,
      PINNED_V5_OUT_DIR: pinnedRoot,
    },
  });

  const { writeV4Dotenv, prepareDockerDatabase } = require('./shared');
  // v5 app uses the same .env shape as the complex example (DATABASE_*); reuse v4 env writer key layout.
  writeV4Dotenv({ ...ctx, V4_APP_DIR: pinnedRoot }, dbEnv);

  if (database === 'sqlite') {
    fs.mkdirSync(path.join(pinnedRoot, '.tmp'), { recursive: true });
    if (fs.existsSync(ctx.SQLITE_PATH)) {
      fs.unlinkSync(ctx.SQLITE_PATH);
    }
  } else {
    await prepareDockerDatabase(ctx, database);
  }

  fs.writeFileSync(path.join(pinnedRoot, 'yarn.lock'), '');

  console.log(`\n📦 yarn install (v5 baseline ${initialVersion})...`);
  await execa('yarn', ['install'], {
    cwd: pinnedRoot,
    stdio: 'inherit',
    env: { ...process.env, ...dbEnv },
  });

  const scriptsDir = path.join(pinnedRoot, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(
    path.join(ctx.COMPLEX_DIR, 'scripts', 'seed-v5.js'),
    path.join(scriptsDir, 'seed-v5.js')
  );

  console.log(`\n🌱 Seeding (seed-v5.js) against Strapi ${initialVersion}...`);
  await execa('node', [path.join('scripts', 'seed-v5.js')], {
    cwd: pinnedRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...dbEnv,
      SEED_MULTIPLIER: String(multiplier),
      MIGRATION_MULTIPLIER: String(multiplier),
    },
  });

  return dbEnv;
}

module.exports = { runV5PinnedBaseline };
