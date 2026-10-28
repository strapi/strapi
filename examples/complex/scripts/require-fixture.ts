const fs = require('fs');
const path = require('path');
const Module = require('module');

const FIXTURE_MARKERS = ['tests/migration/fixture/spec.ts', 'tests/migration/fixture/spec.js'];

/**
 * Locate monorepo root from any fixture script (examples/complex/scripts or ephemeral v4/v5 apps).
 */
function findRepoRoot(startDir = __dirname) {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    if (FIXTURE_MARKERS.some((marker) => fs.existsSync(path.join(dir, marker)))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    'Cannot locate tests/migration/fixture — run from the Strapi monorepo or a scaffolded migration app'
  );
}

let tsxRegistered = false;

/**
 * Load a module from tests/migration/fixture (supports .ts via monorepo tsx).
 * @param {string} subpath extensionless path under fixture/ (e.g. 'spec', 'derive-expectations')
 */
function requireFixture(subpath) {
  const repoRoot = findRepoRoot();
  const fixtureDir = path.join(repoRoot, 'tests/migration/fixture');
  const monorepoRequire = Module.createRequire(path.join(repoRoot, 'package.json'));

  if (!tsxRegistered) {
    monorepoRequire('tsx/cjs/api').register();
    tsxRegistered = true;
  }

  // Prefer .ts (converted tree); fall back to .js during mixed checkout.
  const tsPath = path.join(fixtureDir, `${subpath}.ts`);
  const jsPath = path.join(fixtureDir, `${subpath}.js`);
  const target = fs.existsSync(tsPath) ? tsPath : jsPath;
  if (!fs.existsSync(target)) {
    throw new Error(
      `Fixture module not found: ${subpath} (looked for .ts and .js under ${fixtureDir})`
    );
  }

  return monorepoRequire(target);
}

module.exports = { findRepoRoot, requireFixture };
