'use strict';

/**
 * Fail when a workspace package's build output is missing after the build step.
 *
 * The build restores packages from the Nx cache. If a project declares the wrong `outputs`, Nx
 * reports a cache hit but restores nothing, and every test job then fails far from the cause
 * with "Cannot find module .../dist/...". Checking that every built package has a non-empty
 * `dist/` and its `main` file stops the run at the build, with the package named.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const workspaces = execFileSync('yarn', ['workspaces', 'list', '--json'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
  .filter(({ location }) => location.startsWith('packages/'));

const missing = [];

for (const { name, location } of workspaces) {
  const pkg = JSON.parse(fs.readFileSync(path.join(location, 'package.json'), 'utf8'));
  if (!pkg.scripts?.build) {
    continue;
  }
  const dist = path.join(location, 'dist');
  if (!fs.existsSync(dist) || fs.readdirSync(dist).length === 0) {
    missing.push(`${name}: ${dist}/ is missing or empty`);
    continue;
  }
  if (pkg.main && !fs.existsSync(path.join(location, pkg.main))) {
    missing.push(`${name}: ${path.join(location, pkg.main)}`);
  }
}

if (missing.length > 0) {
  console.error('Build outputs missing after the build step:');
  missing.forEach((line) => console.error(`  ${line}`));
  console.error(
    'If the build was restored from the Nx cache, check the "outputs" of these projects.'
  );
  process.exit(1);
}

console.log(`Build outputs present for every built package.`);
