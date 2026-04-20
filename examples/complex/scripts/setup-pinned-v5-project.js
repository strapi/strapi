#!/usr/bin/env node
'use strict';

/**
 * Copy examples/complex app sources into an isolated directory and write a package.json
 * that depends on a published Strapi v5 version (for migration ladder tests).
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

const packageJson = {
  name: 'complex-pinned-v5',
  version: '0.0.0',
  private: true,
  description: 'Pinned Strapi v5 copy of examples/complex (migration tests only)',
  scripts: {
    build: 'strapi build',
    develop: 'strapi develop',
    start: 'strapi start',
  },
  dependencies: {
    '@strapi/plugin-users-permissions': version,
    '@strapi/strapi': version,
    'better-sqlite3': '12.8.0',
    mysql2: '3.20.0',
    react: '18.3.1',
    'react-dom': '18.3.1',
    'react-router-dom': '6.30.3',
    'styled-components': '6.1.8',
  },
  devDependencies: {
    '@types/node': '^20',
    '@types/react': '^18',
    '@types/react-dom': '^18',
    typescript: '^5',
  },
  engines: {
    node: '>=18.0.0 <=22.x.x',
    npm: '>=6.0.0',
  },
  strapi: {
    uuid: `complex-pinned-${version.replace(/\./g, '-')}`,
  },
};

fs.writeFileSync(
  path.join(resolvedOut, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`
);

console.log('✅ Pinned v5 project layout ready (run yarn install in that directory).');
