import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

/**
 * Smoke test: each override must apply to monorepo paths when oxlint runs like
 * `yarn lint:oxlint` (repo root cwd, `--config` pointing at this package).
 *
 * Oxlint resolves override `files` globs from the config file's directory, so a
 * glob rooted at the repo (`packages/**`) silently never matches. `no-undef` is
 * off in the shared config, so this test forces it on to see which globals each
 * override provides.
 *
 * The config is copied into a temp dir that mirrors the repo layout. Probe files
 * never land in real source trees, where a concurrent lint or type-check would
 * see them.
 */

const CONFIG_DIR = 'packages/utils/oxlint-config';
const packageDir = path.resolve(import.meta.dirname, '..');
const oxlintDir = path.dirname(createRequire(import.meta.url).resolve('oxlint/package.json'));
const oxlintBin = path.join(oxlintDir, 'bin/oxlint');

// Always reported: proves `no-undef` runs on the probe file.
const CONTROL = 'cs026UndefinedControl';

type Diagnostic = { message: string };

let root: string;

beforeAll(() => {
  // realpath: macOS tmpdir is a symlink, keep paths consistent for oxlint.
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-overrides-')));

  const configDir = path.join(root, CONFIG_DIR);
  fs.mkdirSync(configDir, { recursive: true });
  fs.readdirSync(packageDir)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js') || file === 'package.json')
    .forEach((file) => fs.copyFileSync(path.join(packageDir, file), path.join(configDir, file)));

  // The config imports `defineConfig` from `oxlint`.
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.symlinkSync(oxlintDir, path.join(root, 'node_modules/oxlint'), 'dir');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const lintProbe = (dir: string, globals: string[]) => {
  const probe = path.join(root, dir, 'probe.ts');
  fs.mkdirSync(path.dirname(probe), { recursive: true });
  fs.writeFileSync(probe, `export const probe = () => [${[...globals, CONTROL].join(', ')}];\n`);

  let stdout: string;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        oxlintBin,
        '--config',
        path.join(CONFIG_DIR, 'oxlint.config.ts'),
        '-D',
        'no-undef',
        '--format',
        'json',
        probe,
      ],
      { cwd: root, encoding: 'utf8' }
    );
  } catch (error) {
    // oxlint exits 1 when it reports errors; the control guarantees one.
    stdout = (error as { stdout: string }).stdout;
  }

  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
  return diagnostics.map((diagnostic) => diagnostic.message);
};

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
