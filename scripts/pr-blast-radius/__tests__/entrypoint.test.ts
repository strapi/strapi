import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = join(process.cwd(), 'package.json');
test('direct entrypoints replace package aliases while retaining the thin process boundary', async () => {
  const packageJson = JSON.parse(await readFile(root, 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.equal(packageJson.scripts['pr:blast-radius'], undefined);
  assert.equal(packageJson.scripts['pr:blast-radius:test'], undefined);

  const directClassifier =
    'yarn tsx scripts/pr-blast-radius/index.ts <number|https://github.com/strapi/strapi/pull/<number>> [--json]';
  const directTests = 'yarn tsx --test scripts/pr-blast-radius/__tests__/*.test.ts';
  assert.equal(
    directClassifier,
    'yarn tsx scripts/pr-blast-radius/index.ts <number|https://github.com/strapi/strapi/pull/<number>> [--json]'
  );
  assert.equal(directTests, 'yarn tsx --test scripts/pr-blast-radius/__tests__/*.test.ts');

  const cli = await readFile(join(process.cwd(), 'scripts/pr-blast-radius/cli.ts'), 'utf8');
  assert.match(cli, new RegExp(directClassifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(cli, /yarn pr:blast-radius/);

  const source = await readFile(join(process.cwd(), 'scripts/pr-blast-radius/index.ts'), 'utf8');
  assert.match(source, /createCommandRunner\(\)/);
  assert.match(source, /run\(process\.argv\.slice\(2\)/);
  assert.doesNotMatch(source, /retrievePullRequest|analyzeWorkspace|classify\(/);
});
test('direct usage is stderr-only for invalid input before external commands', async () => {
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve) => {
      const child = spawn('yarn', ['tsx', 'scripts/pr-blast-radius/index.ts', '0', '--json'], {
        cwd: process.cwd(),
        shell: false,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    }
  );
  assert.equal(result.code, 2);
  assert.equal(result.stdout, '');
  assert.match(
    result.stderr,
    /Usage: yarn tsx scripts\/pr-blast-radius\/index\.ts <number\|https:\/\/github\.com\/strapi\/strapi\/pull\/<number>> \[--json\]/
  );
  assert.doesNotMatch(result.stderr, /yarn pr:blast-radius/);
});
test('static safety keeps shell execution and prohibited ref operations out of orchestration', async () => {
  const sources = await Promise.all(
    ['app.ts', 'github.ts', 'nx.ts', 'index.ts'].map((file) =>
      readFile(join(process.cwd(), 'scripts/pr-blast-radius', file), 'utf8')
    )
  );
  assert.doesNotMatch(sources.join('\n'), /\b(?:checkout|fetch|diff|reset)\b/);
  const runner = await readFile(
    join(process.cwd(), 'scripts/pr-blast-radius/command-runner.ts'),
    'utf8'
  );
  assert.match(runner, /execFile/);
  assert.match(runner, /shell:\s*false/);
});

test('no Document Service runtime analyzer ownership or references', async () => {
  const directory = join(process.cwd(), 'scripts/pr-blast-radius');
  await Promise.all(
    ['document-service-reach.ts', 'source-analysis.ts'].map(async (file) =>
      assert.rejects(access(join(directory, file)))
    )
  );
  const productionFiles = [
    'app.ts',
    'classifier.ts',
    'cli.ts',
    'command-runner.ts',
    'errors.ts',
    'format.ts',
    'github.ts',
    'index.ts',
    'nx.ts',
    'paths.ts',
    'types.ts',
  ];
  const sources = await Promise.all(
    productionFiles.map((file) => readFile(join(directory, file), 'utf8'))
  );
  const forbidden = [
    'document-service-reach',
    'source-analysis',
    'ReachProvenanceV2',
    'BlastRadiusResultV2',
    'reachProvenance',
    'runtimeAnalysis',
    'WorkspaceRuntimeGraph',
    'parseWorkspaceRuntimeGraph',
    'Runtime contracts',
    'Document Service runtime reach',
  ];
  for (const value of forbidden) assert.doesNotMatch(sources.join('\n'), new RegExp(value));
  assert.doesNotMatch(sources.join('\n'), /['"]nx['"],\s*['"]graph['"]/);
});
