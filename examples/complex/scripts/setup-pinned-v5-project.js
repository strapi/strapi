#!/usr/bin/env node
'use strict';

/**
 * Copy examples/complex app sources into an isolated directory and write a package.json
 * that depends on a published Strapi v5 version (for migration ladder tests).
 *
 * Runtime deps and devDependencies are taken from examples/complex/package.json;
 * every `@strapi/*` entry is rewritten to PINNED_STRAPI_VERSION (fixture uses workspace:*).
 *
 * Env:
 *   PINNED_STRAPI_VERSION — e.g. 5.30.0 (required)
 *   PINNED_V5_OUT_DIR — absolute output directory (required)
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');

const version = process.env.PINNED_STRAPI_VERSION;
const outDir = process.env.PINNED_V5_OUT_DIR;

if (!version || !outDir) {
  console.error(
    'Usage: PINNED_STRAPI_VERSION=5.30.0 PINNED_V5_OUT_DIR=/abs/path node setup-pinned-v5-project.js'
  );
  process.exit(1);
}

const resolvedOut = path.resolve(outDir);

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (fs.existsSync(resolvedOut)) {
  rmrf(resolvedOut);
}
fs.mkdirSync(resolvedOut, { recursive: true });

function copyDir(name) {
  const src = path.join(COMPLEX_DIR, name);
  const dest = path.join(resolvedOut, name);
  if (!fs.existsSync(src)) {
    console.warn(`  (skip missing ${name})`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
}

console.log(`Setting up pinned Strapi ${version} app at:\n  ${resolvedOut}\n`);

for (const dir of ['src', 'config', 'public']) {
  copyDir(dir);
}

const tsconfigSrc = path.join(COMPLEX_DIR, 'tsconfig.json');
if (fs.existsSync(tsconfigSrc)) {
  fs.copyFileSync(tsconfigSrc, path.join(resolvedOut, 'tsconfig.json'));
}

const complexPkgPath = path.join(COMPLEX_DIR, 'package.json');
const complexPkg = JSON.parse(fs.readFileSync(complexPkgPath, 'utf8'));

/** Copy non-Strapi deps from the fixture; pin every `@strapi/*` package to the npm release under test. */
function buildPinnedDependencies(deps, strapiVersion) {
  if (!deps) return {};
  return Object.fromEntries(
    Object.entries(deps).map(([name, spec]) => [
      name,
      name.startsWith('@strapi/') ? strapiVersion : spec,
    ])
  );
}

const packageJson = {
  name: 'complex-pinned-v5',
  version: '0.0.0',
  private: true,
  description:
    'Pinned Strapi v5 copy of the migration test fixture (examples/complex; migration tests only)',
  scripts: {
    build: 'strapi build',
    develop: 'strapi develop',
    start: 'strapi start',
  },
  dependencies: buildPinnedDependencies(complexPkg.dependencies, version),
  devDependencies: { ...(complexPkg.devDependencies || {}) },
  engines: { ...(complexPkg.engines || {}) },
  strapi: {
    uuid: `complex-pinned-${version.replace(/\./g, '-')}`,
  },
};

fs.writeFileSync(
  path.join(resolvedOut, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`
);

console.log('✅ Pinned v5 project layout ready (run yarn install in that directory).');
