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

type V4BaselineOpts = {
  database: string;
  multiplier: number;
  dbEnv: DbEnv;
  initialVersion?: string;
};

/**
 * Scaffold v4 app, prepare DB, install, seed (same DB the later stages use).
 */
async function runV4Baseline(ctx: MigrationContext, opts: V4BaselineOpts): Promise<DbEnv> {
  const { database, multiplier, dbEnv, initialVersion = 'legacy' } = opts;

  console.log('\n📁 Scaffolding Strapi v4 app...');
  await execa(
    process.execPath,
    ['--import', 'tsx', path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-v4-project.ts')],
    {
      cwd: ctx.REPO_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        V4_OUTSIDE_DIR: ctx.V4_APP_DIR,
        STRAPI_V4_VERSION: initialVersion,
        NODE_PATH: [path.join(ctx.REPO_ROOT, 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
    }
  );

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
  await execa(
    process.execPath,
    ['--import', 'tsx', path.join('scripts', 'seed.ts'), '--multiplier', String(multiplier)],
    {
      cwd: ctx.V4_APP_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...dbEnv,
        SEED_MULTIPLIER: String(multiplier),
        NODE_PATH: [path.join(ctx.REPO_ROOT, 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
    }
  );

  return dbEnv;
}

module.exports = { runV4Baseline };
