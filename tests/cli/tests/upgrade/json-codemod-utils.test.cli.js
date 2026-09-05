'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const coffee = require('coffee');

const repoRoot = path.resolve(__dirname, '../../../..');
const upgradeRoot = path.join(repoRoot, 'packages/utils/upgrade');
const transformJs = path.join(upgradeRoot, 'dist/src/modules/runner/json/transform.js');
const smokeCodemod = path.join(upgradeRoot, 'resources/examples/smoke-shared-util-import.json.ts');

/** Spawns plain Node so Jest does not transpile the codemod / util import graph. */
function spawnSmoke(projectDir) {
  const script = `
    const path = require('path');
    const { transformJSON } = require(${JSON.stringify(transformJs)});

    (async () => {
      const projectDir = process.argv[1];
      const packageJsonPath = path.join(projectDir, 'package.json');
      const report = await transformJSON(
        ${JSON.stringify(smokeCodemod)},
        [packageJsonPath],
        { cwd: projectDir, dry: true }
      );

      if (report.error !== 0) {
        console.error(JSON.stringify(report));
        process.exit(1);
      }

      console.log('ok');
    })().catch((err) => {
      console.error(err && err.stack ? err.stack : err);
      process.exit(1);
    });
  `;

  return coffee.spawn(process.execPath, ['-e', script, projectDir], {
    cwd: repoRoot,
  });
}

describe('upgrade JSON codemod shared utils', () => {
  beforeAll(() => {
    if (!fs.existsSync(transformJs)) {
      throw new Error(
        `Missing ${transformJs}; build @strapi/upgrade first (yarn nx build @strapi/upgrade)`
      );
    }
    if (!fs.existsSync(smokeCodemod)) {
      throw new Error(`Missing smoke codemod at ${smokeCodemod}`);
    }
  });

  it('loads a JSON codemod that imports a TypeScript util under resources/utils', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upgrade-cli-smoke-'));
    try {
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'smoke' }));

      await spawnSmoke(projectDir).expect('code', 0).expect('stdout', /ok/).end();
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
