import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeNxUpperBounds } from '../nx';
import { BlastRadiusError, ExitCode } from '../errors';

test('uses a PR-wide merge bound and safe per-path probes without a shell', async () => {
  const calls: Array<{
    executable: string;
    args: readonly string[];
    env?: Readonly<Record<string, string>>;
  }> = [];
  const result = await analyzeNxUpperBounds({
    executablePaths: ['packages/a/src/a.ts', 'packages/b/src/b.ts'],
    runner: async (call) => {
      calls.push(call);
      if (call.args.includes('graph'))
        return {
          stdout: JSON.stringify({
            graph: {
              nodes: { a: { data: { root: 'packages/a' } }, b: { data: { root: 'packages/b' } } },
              dependencies: { a: [], b: [{ target: 'a' }] },
            },
          }),
          stderr: '',
        };
      if (!call.args.includes('--affected')) return { stdout: '["a","b"]', stderr: '' };
      if (call.args.includes('--base=HEAD^1')) return { stdout: '["a","b"]', stderr: '' };
      return {
        stdout: call.args.includes('--files=packages/a/src/a.ts') ? '["a"]' : '["b"]',
        stderr: '',
      };
    },
    temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
  });
  assert.deepEqual(result.prWideProjects, ['a', 'b']);
  assert.deepEqual(
    result.pathProjects,
    new Map([
      ['packages/a/src/a.ts', ['a']],
      ['packages/b/src/b.ts', ['b']],
    ])
  );
  assert.equal(
    calls.every((call) => call.executable === 'yarn'),
    true
  );
  assert.equal(
    calls.some((call) => call.args.includes('--base=HEAD^1') && call.args.includes('--head=HEAD')),
    true
  );
  assert.equal(
    calls.every(
      (call) => call.env?.NX_DAEMON === 'false' && call.env?.NX_CACHE_PROJECT_GRAPH === 'false'
    ),
    true
  );
});

test('uses the complete bound for comma paths and fails malformed or unavailable Nx evidence', async () => {
  const calls: Array<readonly string[]> = [];
  const runner = async ({ args }: { args: readonly string[] }) => {
    calls.push(args);
    if (args.includes('graph'))
      return {
        stdout: JSON.stringify({
          graph: { nodes: { a: { data: { root: 'packages/a' } } }, dependencies: { a: [] } },
        }),
        stderr: '',
      };
    return { stdout: '["a"]', stderr: '' };
  };
  const result = await analyzeNxUpperBounds({
    executablePaths: ['packages/a,a.ts'],
    runner,
    temp: { create: async () => '/tmp/x', remove: async () => undefined },
  });
  assert.deepEqual(result.pathProjects.get('packages/a,a.ts'), ['a']);
  assert.equal(
    calls.some((args) => args.includes('--files=packages/a,a.ts')),
    false
  );
  assert.deepEqual(result.pathReasonCodes.get('packages/a,a.ts'), ['nx-path-unrepresentable']);

  await assert.rejects(
    () =>
      analyzeNxUpperBounds({
        executablePaths: ['a.ts'],
        runner: async () => ({ stdout: '{}', stderr: '' }),
        temp: { create: async () => '/tmp/x', remove: async () => undefined },
      }),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
  );
});

test('rejects graphs without exact node and dependency-key coverage before semantic narrowing', async () => {
  const projects = '["a","b"]';
  const graphCases = [
    { nodes: { a: { data: { root: 'packages/a' } } }, dependencies: { a: [], b: [] } },
    {
      nodes: { a: { data: { root: 'packages/a' } }, b: { data: { root: 'packages/b' } } },
      dependencies: { a: [] },
    },
    {
      nodes: {
        a: { data: { root: 'packages/a' } },
        b: { data: { root: 'packages/b' } },
        outside: { data: { root: 'packages/outside' } },
      },
      dependencies: { a: [], b: [], outside: [] },
    },
    {
      nodes: { a: { data: { root: 'packages/a' } }, b: { data: { root: 'packages/b' } } },
      dependencies: { a: [], b: [], outside: [] },
    },
  ];
  for (const graph of graphCases) {
    await assert.rejects(
      () =>
        analyzeNxUpperBounds({
          executablePaths: ['packages/a/src/a.ts'],
          runner: async ({ args }) => {
            if (args.includes('graph')) return { stdout: JSON.stringify({ graph }), stderr: '' };
            return { stdout: projects, stderr: '' };
          },
          temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
        }),
      (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.Nx
    );
  }
});
