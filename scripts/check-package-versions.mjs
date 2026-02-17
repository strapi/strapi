#!/usr/bin/env node

/**
 * Ensures all workspace package.json files that have a "version" field use the
 * same version as the canonical source (@strapi/strapi). Run from repo root.
 *
 * Usage:
 *   node scripts/check-package-versions.mjs              # check only, exit 1 if mismatch
 *   node scripts/check-package-versions.mjs --fix        # write canonical version to mismatched packages
 *   node scripts/check-package-versions.mjs --fix --prompt # prompt for each package before fixing
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim().toLowerCase());
    });
  });
}

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_PACKAGE = path.join(ROOT, 'packages/core/strapi/package.json');

// Same scope as syncpack: root + all package.json under repo (exclude node_modules)
function findPackageJsonFiles() {
  const rootPkg = path.join(ROOT, 'package.json');
  const all = globSync('**/package.json', {
    cwd: ROOT,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });
  const set = new Set(all);
  set.add(rootPkg);
  return [...set];
}

function getCanonicalVersion() {
  const data = JSON.parse(fs.readFileSync(CANONICAL_PACKAGE, 'utf8'));
  if (!data.version) {
    throw new Error(`${CANONICAL_PACKAGE} has no "version" field`);
  }
  return data.version;
}

// Only enforce alignment for packages that share the same major as canonical (e.g. 5.x.x).
// Skip examples/test-apps/docs that use 0.0.0 or 0.1.0.
function shouldEnforceVersion(currentVersion, canonicalVersion) {
  const canonicalMajor = canonicalVersion.split('.')[0];
  const currentMajor = currentVersion.split('.')[0];
  return currentMajor === canonicalMajor;
}

async function main() {
  const hasFixArg = process.argv.includes('--fix');
  const hasPromptArg = process.argv.includes('--prompt');
  const canonicalVersion = getCanonicalVersion();
  const files = findPackageJsonFiles();
  const mismatches = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      continue;
    }
    if (data.version === undefined) continue;
    if (data.version === canonicalVersion) continue;
    if (!shouldEnforceVersion(data.version, canonicalVersion)) continue;
    mismatches.push({ file, rel, current: data.version });
  }

  if (mismatches.length === 0) {
    console.log(`All package versions are aligned at ${canonicalVersion}.`);
    process.exit(0);
    return;
  }

  if (hasFixArg) {
    let fixed = 0;
    for (const { file, rel, current } of mismatches) {
      if (hasPromptArg) {
        const answer = await ask(`${rel}: ${current} → ${canonicalVersion}? (y/n) `);
        if (answer !== 'y' && answer !== 'yes') continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      const updated = content.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${canonicalVersion}"`);
      if (updated === content) {
        console.error(`Could not update version in ${rel}`);
        process.exit(1);
      }
      fs.writeFileSync(file, updated, 'utf8');
      console.log(`${rel}: ${current} → ${canonicalVersion}`);
      fixed += 1;
    }
    console.log(`Updated ${fixed} package(s) to ${canonicalVersion}.`);
    process.exit(0);
    return;
  }

  console.error(
    `Package version mismatch (canonical: ${canonicalVersion} from packages/core/strapi/package.json):`
  );
  for (const { rel, current } of mismatches) {
    console.error(`  ${rel}: ${current} → ${canonicalVersion}`);
  }
  console.error(`Run: node scripts/check-package-versions.mjs --fix [--prompt]`);
  process.exit(1);
}

main();
