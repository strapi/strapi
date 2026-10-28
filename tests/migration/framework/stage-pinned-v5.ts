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

type PinnedStage = {
  version: string;
  dbEnv: DbEnv;
};

async function runPinnedStrapiStage(ctx: MigrationContext, stage: PinnedStage): Promise<void> {
  const { version } = stage;
  const pinnedRoot = path.join(ctx.MIGRATION_ROOT, 'pinned-v5', version);

  console.log(`\n📌 Pinned Strapi ${version}: preparing app at ${pinnedRoot}...`);
  // Prefer `node --import tsx` over the tsx CLI (avoids listen EPERM on tsx IPC pipes).
  await execa(
    process.execPath,
    ['--import', 'tsx', path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-pinned-v5-project.ts')],
    {
      cwd: ctx.REPO_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        PINNED_STRAPI_VERSION: version,
        PINNED_V5_OUT_DIR: pinnedRoot,
        NODE_PATH: [path.join(ctx.REPO_ROOT, 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
    }
  );

  const { nestedYarnInstallEnv } = require('./shared');

  fs.writeFileSync(path.join(pinnedRoot, 'yarn.lock'), '');

  console.log(`\n📦 yarn install (pinned Strapi ${version})...`);
  await execa('yarn', ['install'], {
    cwd: pinnedRoot,
    stdio: 'inherit',
    env: nestedYarnInstallEnv(stage.dbEnv),
  });

  const bootScript = path.join(__dirname, 'boot-strapi-once.ts');
  console.log(
    `\n🚀 Booting Strapi ${version} once (applies internal migrations up to this release)...`
  );
  // Prefer `node --import tsx` over the tsx CLI (avoids listen EPERM on tsx IPC pipes).
  await execa(process.execPath, ['--import', 'tsx', bootScript, pinnedRoot], {
    cwd: ctx.REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...stage.dbEnv },
  });
}

module.exports = { runPinnedStrapiStage };
