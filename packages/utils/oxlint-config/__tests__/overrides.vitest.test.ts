import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

/**
 * Smoke test: each override must apply to real monorepo paths when oxlint runs
 * like `yarn lint:oxlint` (repo root cwd, `--config` pointing at this package).
 *
 * Oxlint resolves override `files` globs from the config file's directory, so a
 * glob rooted at the repo (`packages/**`) silently never matches. `no-undef` is
 * off in the shared config, so this test forces it on to see which globals each
 * override provides.
 */

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
const configPath = path.join(import.meta.dirname, '../oxlint.config.ts');
const oxlintBin = path.join(
  path.dirname(createRequire(import.meta.url).resolve('oxlint/package.json')),
  'bin/oxlint'
);

// Always reported: proves `no-undef` runs on the probe file.
const CONTROL = 'cs026UndefinedControl';

type Diagnostic = { message: string };

const probes: string[] = [];

const lintProbe = (dir: string, globals: string[]) => {
  const probe = path.join(repoRoot, dir, `__oxlint-overrides-probe-${process.pid}__.ts`);
  probes.push(probe);
  fs.writeFileSync(probe, `export const probe = () => [${[...globals, CONTROL].join(', ')}];\n`);

  let stdout: string;
  try {
    stdout = execFileSync(
      process.execPath,
      [oxlintBin, '--config', configPath, '-D', 'no-undef', '--format', 'json', probe],
      { cwd: repoRoot, encoding: 'utf8' }
    );
  } catch (error) {
    // oxlint exits 1 when it reports errors; the control guarantees one.
    stdout = (error as { stdout: string }).stdout;
  }

  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
  return diagnostics.map((diagnostic) => diagnostic.message);
};

afterEach(() => {
  probes.splice(0).forEach((probe) => fs.rmSync(probe, { force: true }));
});

describe('oxlint overrides', () => {
  test('back applies Node env and strapi global to server code', () => {
    expect(lintProbe('packages/core/email/server/src', ['strapi', 'process'])).toEqual([
      `'${CONTROL}' is not defined.`,
    ]);
  });

  test('front applies browser env to non-tsx admin code', () => {
    expect(lintProbe('packages/core/admin/admin/src', ['window', 'document'])).toEqual([
      `'${CONTROL}' is not defined.`,
    ]);
  });
});
