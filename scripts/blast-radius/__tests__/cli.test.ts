import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { parseCliArgs } from '../cli';
import { BlastRadiusError, ExitCode } from '../errors';

test('accepts only no arguments or a single JSON flag', () => {
  assert.deepEqual(parseCliArgs([]), { json: false });
  assert.deepEqual(parseCliArgs(['--json']), { json: true });

  for (const argv of [
    ['27557'],
    ['https://github.com/strapi/strapi/pull/27557'],
    ['--json', '--json'],
    ['--json', '27557'],
    ['--'],
    ['--unknown'],
  ]) {
    assert.throws(
      () => parseCliArgs(argv),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.InvalidInput
    );
  }
});

test('the renamed entrypoint rejects arguments before external analysis', async () => {
  const child = spawn('yarn', ['tsx', 'scripts/blast-radius/index.ts', '27557', '--json'], {
    cwd: process.cwd(),
    shell: false,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += String(chunk)));
  child.stderr.on('data', (chunk) => (stderr += String(chunk)));
  const code = await new Promise<number | null>((resolve) => child.on('close', resolve));

  assert.equal(code, 2);
  assert.equal(stdout, '');
  assert.match(stderr, /Usage: yarn tsx scripts\/blast-radius\/index\.ts \[--json\]/);
});

test('the old API/name surface is absent and the implementation contains no GitHub client', async () => {
  const root = process.cwd();
  await assert.rejects(readFile(join(root, 'scripts/pr-blast-radius/cli.ts')));
  await assert.rejects(readFile(join(root, 'scripts/blast-radius/github.ts')));
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.equal(packageJson.scripts['pr:blast-radius'], undefined);
  assert.equal(packageJson.scripts['pr:blast-radius:test'], undefined);
});
