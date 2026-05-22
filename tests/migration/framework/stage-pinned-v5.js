'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');

/**
 * @param {object} ctx
 * @param {{ version: string, dbEnv: Record<string, string> }} stage
 */
async function runPinnedStrapiStage(ctx, stage) {
  const { version } = stage;
  const pinnedRoot = path.join(ctx.MIGRATION_ROOT, 'pinned-v5', version);

  console.log(`\n📌 Pinned Strapi ${version}: preparing app at ${pinnedRoot}...`);
  await execa('node', [path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-pinned-v5-project.js')], {
    cwd: ctx.REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      PINNED_STRAPI_VERSION: version,
      PINNED_V5_OUT_DIR: pinnedRoot,
    },
  });

  const { nestedYarnInstallEnv } = require('./shared');

  fs.writeFileSync(path.join(pinnedRoot, 'yarn.lock'), '');

  console.log(`\n📦 yarn install (pinned Strapi ${version})...`);
  await execa('yarn', ['install'], {
    cwd: pinnedRoot,
    stdio: 'inherit',
    env: nestedYarnInstallEnv(stage.dbEnv),
  });

  const bootScript = path.join(__dirname, 'boot-strapi-once.js');
  console.log(
    `\n🚀 Booting Strapi ${version} once (applies internal migrations up to this release)...`
  );
  await execa(process.execPath, [bootScript, pinnedRoot], {
    cwd: ctx.REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...stage.dbEnv },
  });
}

module.exports = { runPinnedStrapiStage };
