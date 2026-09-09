import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeWorkspace } from '../nx';
import type { CommandRunner } from '../types';
import { BlastRadiusError, ExitCode } from '../errors';
test('uses current workspace graph with per-path safe probes', async () => {
  const calls: string[][] = [];
  const runner: CommandRunner = async ({ executable, args }) => {
    calls.push([executable, ...args]);
    if (executable === 'git') return { stdout: 'a'.repeat(40), stderr: '' };
    return { stdout: args.includes('--affected') ? '["p"]' : '["p","q"]', stderr: '' };
  };
  const result = await analyzeWorkspace(runner, ['a.ts']);
  assert.deepEqual(result.affectedProjects, ['p']);
  assert.equal(
    calls.some((call) => call.includes('--files=a.ts')),
    true
  );
});
test('failure malformed unmapped comma and revision paths fail safely', async () => {
  const runner: CommandRunner = async ({ executable, args }) =>
    executable === 'git'
      ? { stdout: 'a'.repeat(40), stderr: '' }
      : { stdout: args.includes('--affected') ? '[]' : '["p"]', stderr: '' };
  await assert.rejects(() => analyzeWorkspace(runner, ['packages/core/src/a.ts']));
  await assert.rejects(() => analyzeWorkspace(runner, ['a,b.ts']));
  const bad: CommandRunner = async ({ executable }) =>
    executable === 'git' ? { stdout: 'not-a-revision', stderr: '' } : { stdout: '[]', stderr: '' };
  await assert.rejects(() => analyzeWorkspace(bad, ['docs/a.md']));
});

test('uses isolated Nx environment and maps graph failures to exit 5 and unmapped paths to exit 6', async () => {
  const calls: Array<{
    executable: string;
    args: readonly string[];
    env?: Readonly<Record<string, string>>;
  }> = [];
  const runner: CommandRunner = async (request) => {
    calls.push(request);
    if (request.executable === 'git') return { stdout: 'a'.repeat(40), stderr: '' };
    return { stdout: request.args.includes('--affected') ? '["p"]' : '["p","q"]', stderr: '' };
  };
  const value = await analyzeWorkspace(runner, ['z.ts', 'a.ts']);
  assert.deepEqual(value.affectedProjects, ['p']);
  for (const call of calls.filter((call) => call.executable === 'yarn')) {
    assert.equal(call.env?.NX_DAEMON, 'false');
    assert.equal(call.env?.NX_CACHE_PROJECT_GRAPH, 'false');
    assert.match(String(call.env?.NX_WORKSPACE_DATA_DIRECTORY), /strapi-pr-blast-radius-/);
  }
  const invalid: CommandRunner = async ({ executable }) =>
    executable === 'git' ? { stdout: 'a'.repeat(40), stderr: '' } : { stdout: '{}', stderr: '' };
  await assert.rejects(
    () => analyzeWorkspace(invalid, ['docs/a.md']),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
  const subset: CommandRunner = async ({ executable, args }) =>
    executable === 'git'
      ? { stdout: 'a'.repeat(40), stderr: '' }
      : { stdout: args.includes('--affected') ? '["outside"]' : '["p"]', stderr: '' };
  await assert.rejects(
    () => analyzeWorkspace(subset, ['docs/a.md']),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
});

test('maps temporary workspace setup and cleanup failures to Nx while preserving primary failures', async () => {
  const runner: CommandRunner = async ({ executable, args }) =>
    executable === 'git'
      ? { stdout: 'a'.repeat(40), stderr: '' }
      : { stdout: args.includes('--affected') ? '[]' : '["p"]', stderr: '' };
  const setup = {
    createTemp: async () => {
      throw new Error('no tmp');
    },
    removeTemp: async () => undefined,
  };
  await assert.rejects(
    () => analyzeWorkspace(runner, ['docs/a.md'], process.cwd(), setup),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
  const removed: string[] = [];
  const lifecycle = {
    createTemp: async () => '/tmp/blast-radius-test',
    removeTemp: async (path: string) => {
      removed.push(path);
    },
  };
  await analyzeWorkspace(runner, ['docs/a.md'], process.cwd(), lifecycle);
  assert.deepEqual(removed, ['/tmp/blast-radius-test']);
  const cleanupFails = {
    createTemp: async () => '/tmp/blast-radius-test',
    removeTemp: async () => {
      throw new Error('cleanup');
    },
  };
  await assert.rejects(
    () => analyzeWorkspace(runner, ['docs/a.md'], process.cwd(), cleanupFails),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
  await assert.rejects(
    () => analyzeWorkspace(runner, ['unknown.ts'], process.cwd(), cleanupFails),
    (error: unknown) =>
      error instanceof BlastRadiusError && error.exitCode === ExitCode.UnrecognizedPath
  );
});

test('uses one discrete probe for deletions and two sorted probes for renames, and rejects runner and revision races', async () => {
  const calls: string[][] = [];
  let gitCalls = 0;
  const runner: CommandRunner = async ({ executable, args }) => {
    calls.push([executable, ...args]);
    if (executable === 'git') {
      gitCalls += 1;
      return { stdout: (gitCalls === 1 ? 'a' : 'b').repeat(40), stderr: '' };
    }
    return { stdout: args.includes('--affected') ? '["p"]' : '["p"]', stderr: '' };
  };
  await assert.rejects(
    () => analyzeWorkspace(runner, ['new name;$(x).ts', 'old.ts']),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
  assert.equal(
    calls.some((call) => call.includes('--files=new name;$(x).ts')),
    true
  );
  const failing: CommandRunner = async () => {
    throw new Error('runner failure');
  };
  await assert.rejects(
    () => analyzeWorkspace(failing, ['docs/a.md']),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
});
