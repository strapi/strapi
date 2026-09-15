import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createResult, renderJson } from '../format';
import { runSummary } from '../summary-app';

const result = createResult({
  snapshot: {
    number: 3,
    state: 'open',
    merged: false,
    base: { branch: 'develop', sha: 'a'.repeat(40) },
    head: { sha: 'b'.repeat(40) },
    additions: 1,
    deletions: 0,
    changedFiles: 1,
    files: [{ path: 'safe.ts', status: 'modified' }],
  },
  workspaceRevision: 'c'.repeat(40),
  radius: 'LOCAL',
  reasons: [],
  affectedProjects: ['plain-project'],
  totalProjects: 2,
  sensitivitySignals: [],
});

test('renders Markdown only from exactly one structurally valid JSON file', async () => {
  const outcome = await runSummary(['result.json'], async (path) => {
    assert.equal(path, 'result.json');
    return renderJson(result);
  });

  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.stderr, '');
  assert.match(outcome.stdout, /^## PR strapi\/strapi#3 — LOCAL/);
});

test('accepts the 64-hex workspace revision emitted by Nx', async () => {
  const outcome = await runSummary(['result.json'], async () =>
    JSON.stringify({ ...result, workspaceRevision: 'c'.repeat(64) })
  );

  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.stderr, '');
  assert.match(outcome.stdout, /Current checkout Nx graph: ccccccc/);
});

test('runs the summary entrypoint as a real child process', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pr-blast-radius-summary-'));
  const resultPath = join(directory, 'result.json');
  await writeFile(resultPath, renderJson(result), 'utf8');

  try {
    const outcome = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolve) => {
        const child = spawn('yarn', ['tsx', 'scripts/pr-blast-radius/summary.ts', resultPath], {
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
    assert.equal(outcome.code, 0);
    assert.equal(outcome.stderr, '');
    assert.match(outcome.stdout, /^## PR strapi\/strapi#3 — LOCAL/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects invalid arguments and malformed or unusable JSON without output', async () => {
  const invalidArgs = await runSummary([], async () => renderJson(result));
  assert.equal(invalidArgs.exitCode, 1);
  assert.equal(invalidArgs.stdout, '');
  assert.match(
    invalidArgs.stderr,
    /Usage: yarn tsx scripts\/pr-blast-radius\/summary.ts <result-json-path>/
  );

  const malformed = await runSummary(['result.json'], async () => '{');
  assert.equal(malformed.exitCode, 1);
  assert.equal(malformed.stdout, '');
  assert.match(malformed.stderr, /valid JSON/);

  const incomplete = await runSummary(['result.json'], async () =>
    JSON.stringify({ schemaVersion: 1 })
  );
  assert.equal(incomplete.exitCode, 1);
  assert.equal(incomplete.stdout, '');
  assert.match(incomplete.stderr, /structurally usable/);
});

test('rejects mismatched counts and malformed changed-file records', async () => {
  const invalidResults = [
    { ...result, prRevision: 'B'.repeat(40) },
    { ...result, workspaceRevision: 'c'.repeat(39) },
    { ...result, totalProjectCount: 0 },
    { ...result, affectedProjectCount: 3 },
    { ...result, affectedProjects: ['plain-project', 'plain-project'], affectedProjectCount: 2 },
    { ...result, affectedProjects: [''], affectedProjectCount: 1 },
    { ...result, changedFiles: [{ path: '', status: 'modified' }] },
    { ...result, changedFiles: [{ path: '../unsafe.ts', status: 'modified' }] },
    { ...result, changedFiles: [{ path: 'unsafe\\path.ts', status: 'modified' }] },
    { ...result, changedFiles: [{ path: 'safe.ts', status: 'unknown' }] },
    {
      ...result,
      changedFiles: [],
      pullRequest: { ...result.pullRequest, reportedChangedFileCount: 1 },
    },
    {
      ...result,
      changedFiles: [
        { path: 'safe.ts', status: 'modified' },
        { path: 'safe.ts', status: 'modified' },
      ],
      pullRequest: { ...result.pullRequest, reportedChangedFileCount: 2 },
    },
    { ...result, reasons: [1] },
    { ...result, warnings: [1] },
  ];

  for (const invalidResult of invalidResults) {
    const outcome = await runSummary(['result.json'], async () => JSON.stringify(invalidResult));
    assert.equal(outcome.exitCode, 1);
    assert.equal(outcome.stdout, '');
    assert.match(outcome.stderr, /structurally usable/);
  }
});
