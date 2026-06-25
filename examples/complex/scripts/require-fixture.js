'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Locate monorepo root from any fixture script (examples/complex/scripts or ephemeral v4/v5 apps).
 */
function findRepoRoot(startDir = __dirname) {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'tests/migration/fixture/spec.js'))) {
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

function requireFixture(subpath) {
  const repoRoot = findRepoRoot();
  return require(path.join(repoRoot, 'tests/migration/fixture', subpath));
}

module.exports = { findRepoRoot, requireFixture };
