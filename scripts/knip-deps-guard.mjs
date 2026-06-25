#!/usr/bin/env node

/**
 * Guardrails for `yarn knip:deps:fix`.
 *
 * Runs knip against sentinel workspaces whose dependency graphs are easy to
 * mis-analyse when knip.json entry/project patterns are wrong (JS plugins,
 * lib/ sources, dynamic providers). Exits non-zero before auto-fix if any
 * sentinel dependency would be incorrectly removed.
 *
 * Usage:
 *   node scripts/knip-deps-guard.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** @typedef {{ name: string; workspace: string; mustNotReportUnused: string[]; minProdDependencies?: number; packageJson?: string }} Sentinel */

/** @type {Sentinel[]} */
const SENTINELS = [
  {
    name: 'JS/JSX plugin entry points',
    workspace: '@strapi/plugin-users-permissions',
    packageJson: 'packages/plugins/users-permissions/package.json',
    minProdDependencies: 10,
    mustNotReportUnused: ['bcryptjs', 'jsonwebtoken', 'lodash', 'react-intl', 'yup'],
  },
  {
    name: '@strapi/typescript-utils lib/ sources',
    workspace: '@strapi/typescript-utils',
    packageJson: 'packages/utils/typescript/package.json',
    mustNotReportUnused: ['chalk', 'lodash', 'fs-extra', 'prettier'],
  },
  {
    name: 'Dynamic email provider (require.resolve)',
    workspace: '@strapi/email',
    packageJson: 'packages/core/email/package.json',
    mustNotReportUnused: ['@strapi/provider-email-sendmail'],
  },
  {
    name: 'Dynamic upload provider (require.resolve)',
    workspace: '@strapi/upload',
    packageJson: 'packages/core/upload/package.json',
    mustNotReportUnused: ['@strapi/provider-upload-local'],
  },
];

/**
 * @param {string} workspace
 * @returns {string}
 */
function knipDepsReport(workspace) {
  try {
    return execSync(
      `yarn knip --no-progress --production --dependencies --workspace '${workspace}'`,
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  } catch (error) {
    const stdout = error.stdout?.toString() ?? '';
    const stderr = error.stderr?.toString() ?? '';
    return stdout + stderr;
  }
}

/**
 * @param {string} report
 * @returns {string[]}
 */
function parseUnusedDependencies(report) {
  const match = report.match(
    /Unused dependencies \(\d+\)\n([\s\S]*?)(?:\nUnlisted|\nConfiguration|\n$)/
  );
  if (!match) {
    return [];
  }

  return match[1]
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function countProdDependencies(packageJsonRelativePath) {
  const pkgPath = path.join(ROOT, packageJsonRelativePath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return Object.keys(pkg.dependencies ?? {}).length;
}

let failed = false;

for (const sentinel of SENTINELS) {
  const report = knipDepsReport(sentinel.workspace);
  const unused = parseUnusedDependencies(report);
  const falsePositives = sentinel.mustNotReportUnused.filter((dep) => unused.includes(dep));

  if (sentinel.minProdDependencies !== undefined && sentinel.packageJson) {
    const count = countProdDependencies(sentinel.packageJson);
    if (count < sentinel.minProdDependencies) {
      console.error(
        `✗ ${sentinel.name} (${sentinel.workspace}): only ${count} prod dependencies in package.json (expected ≥ ${sentinel.minProdDependencies}). Entry/project patterns may be broken.`
      );
      failed = true;
    }
  }

  if (falsePositives.length > 0) {
    console.error(
      `✗ ${sentinel.name} (${sentinel.workspace}): knip would incorrectly remove: ${falsePositives.join(', ')}`
    );
    console.error('  Update knip.json entry/project patterns before running knip:deps:fix.');
    failed = true;
  } else {
    console.log(`✓ ${sentinel.name} (${sentinel.workspace})`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('\nKnip dependency guard passed — safe to run knip:deps:fix.');
