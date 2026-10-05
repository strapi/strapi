const fs = require('fs');
const path = require('path');
const execa = require('execa');

type MigrationContext = {
  REPO_ROOT: string;
  COMPLEX_DIR: string;
  MIGRATION_ROOT: string;
  V4_APP_DIR: string;
  SQLITE_PATH: string;
  DOCKER_COMPOSE_FILE: string;
  DOTENV_PATH: string;
};

type DbEnv = Record<string, string>;

type V5PinnedBaselineOpts = {
  database: string;
  multiplier: number;
  dbEnv: DbEnv;
  initialVersion: string;
};

/**
 * Pinned published Strapi v5 at `initialVersion` + same DB as the rest of the run + canonical v5 seed (seed-v5.ts).
 * Used when baseline.type is "v5-pinned" (no v4 step).
 */
async function runV5PinnedBaseline(
  ctx: MigrationContext,
  opts: V5PinnedBaselineOpts
): Promise<DbEnv> {
  const { database, multiplier, dbEnv, initialVersion } = opts;
  const pinnedRoot = path.join(ctx.MIGRATION_ROOT, 'v5-baseline', initialVersion);

  console.log(
    `\n📁 Pinned Strapi v5 baseline ${initialVersion} (canonical v5 seed) at ${pinnedRoot}...`
  );
  await execa(
    process.execPath,
    ['--import', 'tsx', path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-pinned-v5-project.ts')],
    {
      cwd: ctx.REPO_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        PINNED_STRAPI_VERSION: initialVersion,
        PINNED_V5_OUT_DIR: pinnedRoot,
        NODE_PATH: [path.join(ctx.REPO_ROOT, 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
    }
  );

  const { writeAppDotenv, prepareDockerDatabase, nestedYarnInstallEnv } = require('./shared');
  writeAppDotenv({ ...ctx, V4_APP_DIR: pinnedRoot }, dbEnv);

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
    env: nestedYarnInstallEnv(dbEnv),
  });

  const scriptsDir = path.join(pinnedRoot, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(
    path.join(ctx.COMPLEX_DIR, 'scripts', 'seed-v5.ts'),
    path.join(scriptsDir, 'seed-v5.ts')
  );
  fs.copyFileSync(
    path.join(ctx.COMPLEX_DIR, 'scripts', 'require-fixture.ts'),
    path.join(scriptsDir, 'require-fixture.ts')
  );

  console.log(`\n🌱 Seeding (seed-v5.ts) against Strapi ${initialVersion}...`);
  await execa(process.execPath, ['--import', 'tsx', path.join('scripts', 'seed-v5.ts')], {
    cwd: pinnedRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...dbEnv,
      SEED_MULTIPLIER: String(multiplier),
      MIGRATION_MULTIPLIER: String(multiplier),
      NODE_PATH: [path.join(ctx.REPO_ROOT, 'node_modules'), process.env.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter),
    },
  });

  return dbEnv;
}

module.exports = { runV5PinnedBaseline };
