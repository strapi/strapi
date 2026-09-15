import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { run } from '../app';
import type { CommandRunner } from '../types';
const meta = {
  number: 1,
  state: 'open',
  merged: false,
  base: { ref: 'develop', sha: 'a'.repeat(40), repo: { full_name: 'strapi/strapi' } },
  head: { sha: 'b'.repeat(40) },
  additions: 0,
  deletions: 0,
  changed_files: 0,
};
test('json failure output is isolated', async () => {
  let called = false;
  const runner: CommandRunner = async () => {
    called = true;
    return { stdout: '', stderr: '' };
  };
  const value = await run(['0', '--json'], { runner });
  assert.equal(value.exitCode, 2);
  assert.equal(value.stdout, '');
  assert.equal(called, false);
});

test('orchestrates a JSON success without diagnostic noise and uses only read-only commands', async () => {
  const calls: Array<{ executable: string; args: readonly string[] }> = [];
  const runner: CommandRunner = async (request) => {
    calls.push(request);
    const endpoint = request.args.at(-1);
    if (request.executable === 'gh')
      return { stdout: JSON.stringify(endpoint?.includes('/files?') ? [] : meta), stderr: '' };
    if (request.executable === 'git') return { stdout: 'c'.repeat(40), stderr: '' };
    return { stdout: request.args.includes('--affected') ? '[]' : '["root"]', stderr: '' };
  };
  const value = await run(['1', '--json'], { runner });
  assert.equal(value.exitCode, 0);
  assert.equal(value.stderr, '');
  assert.equal(JSON.parse(value.stdout).radius, 'NON_RUNTIME');
  assert.equal(
    calls.every(
      ({ executable, args }) =>
        (executable === 'gh' && args[0] === 'api' && args.includes('GET')) ||
        (executable === 'git' && args.join(' ') === 'rev-parse --verify HEAD^{commit}') ||
        (executable === 'yarn' && args.slice(0, 3).join(' ') === 'nx show projects')
    ),
    true
  );
  assert.equal(
    calls.some(({ args }) => args.includes('b'.repeat(40))),
    false
  );
});

test('preserves known exit categories with empty stdout', async () => {
  const cases: Array<[number, CommandRunner]> = [
    [
      3,
      async () => {
        throw new Error('authentication failed');
      },
    ],
    [4, async () => ({ stdout: '{}', stderr: '' })],
    [
      5,
      async ({ executable, args }) =>
        executable === 'gh'
          ? {
              stdout: JSON.stringify(String(args.at(-1)).includes('/files?') ? [] : meta),
              stderr: '',
            }
          : { stdout: 'not json', stderr: '' },
    ],
    [
      6,
      async ({ executable, args }) => {
        if (executable === 'gh')
          return {
            stdout: JSON.stringify(
              String(args.at(-1)).includes('/files?')
                ? [{ filename: 'unknown.ts', status: 'modified' }]
                : { ...meta, changed_files: 1 }
            ),
            stderr: '',
          };
        if (executable === 'git') return { stdout: 'c'.repeat(40), stderr: '' };
        return { stdout: args.includes('--affected') ? '[]' : '["root"]', stderr: '' };
      },
    ],
  ];
  for (const [exitCode, runner] of cases) {
    const outcome = await run(['1', '--json'], { runner });
    assert.equal(outcome.exitCode, exitCode);
    assert.equal(outcome.stdout, '');
    assert.notEqual(outcome.stderr, '');
  }
});

test('uses the complete affected-project union and selects the greatest dependency reach', async () => {
  const files = [
    { filename: 'packages/a/src/a.ts', status: 'modified' },
    { filename: 'packages/b/src/b.ts', status: 'modified' },
  ];
  const runner: CommandRunner = async ({ executable, args }) => {
    if (executable === 'gh')
      return {
        stdout: JSON.stringify(
          String(args.at(-1)).includes('/files?') ? files : { ...meta, changed_files: 2 }
        ),
        stderr: '',
      };
    if (executable === 'git') return { stdout: 'c'.repeat(40), stderr: '' };
    if (!args.includes('--affected'))
      return {
        stdout: JSON.stringify(Array.from({ length: 10 }, (_, index) => `p${index}`)),
        stderr: '',
      };
    return {
      stdout: args.includes('--files=packages/a/src/a.ts')
        ? '["p0","p1","p2"]'
        : '["p3","p4","p5"]',
      stderr: '',
    };
  };
  const result = await run(['1', '--json'], { runner });
  assert.equal(result.exitCode, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.affectedProjectCount, 6);
  assert.equal(output.radius, 'REPOSITORY');
});

test('maps an unclassified internal exception to exit 1 with no stdout', async () => {
  const original = Array.prototype.flatMap;
  Array.prototype.flatMap = (() => {
    throw new Error('injected internal fault');
  }) as typeof Array.prototype.flatMap;
  try {
    const outcome = await run(['1', '--json'], {
      runner: async ({ args }) => ({
        stdout: JSON.stringify(String(args.at(-1)).includes('/files?') ? [] : meta),
        stderr: '',
      }),
    });
    assert.equal(outcome.exitCode, 1);
    assert.equal(outcome.stdout, '');
    assert.match(outcome.stderr, /Unexpected blast-radius failure/);
  } finally {
    Array.prototype.flatMap = original;
  }
});

test('Nx path reach for a Document Service path', async () => {
  const calls: Array<{ executable: string; args: readonly string[] }> = [];
  const roots = [
    'packages/core/core',
    'packages/core/content-manager',
    'packages/core/content-releases',
    'packages/core/review-workflows',
    'packages/core/upload',
    'packages/plugins/i18n',
    'packages/plugins/graphql',
    'packages/plugins/users-permissions',
  ];
  const nodes = Object.fromEntries(
    roots.map((root) => {
      const manifest = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')) as {
        name: string;
        exports?: Record<string, { source?: string }>;
      };
      const source = manifest.exports?.['./strapi-server']?.source;
      return [
        manifest.name,
        {
          data: {
            root,
            metadata: { js: { packageExports: source ? { './strapi-server': { source } } : {} } },
          },
        },
      ];
    })
  );
  const projects = Object.keys(nodes).sort();
  const activeMeta = { ...meta, changed_files: 1 };
  const runner: CommandRunner = async (request) => {
    const { executable, args } = request;
    calls.push(request);
    if (executable === 'gh')
      return {
        stdout: JSON.stringify(
          String(args.at(-1)).includes('/files?')
            ? [
                {
                  filename: 'packages/core/core/src/services/document-service/index.ts',
                  status: 'modified',
                },
              ]
            : activeMeta
        ),
        stderr: '',
      };
    if (executable === 'git') return { stdout: 'c'.repeat(40), stderr: '' };
    if (args.includes('graph'))
      return {
        stdout: JSON.stringify({
          graph: {
            nodes,
            dependencies: Object.fromEntries(projects.map((project) => [project, []])),
          },
        }),
        stderr: '',
      };
    return {
      stdout: args.includes('--affected')
        ? JSON.stringify(['@strapi/core'])
        : JSON.stringify(projects),
      stderr: '',
    };
  };
  const outcome = await run(['1', '--json'], { runner });
  assert.equal(outcome.exitCode, 0);
  const output = JSON.parse(outcome.stdout);
  assert.deepEqual(output.affectedProjects, ['@strapi/core']);
  assert.equal(output.affectedProjectCount, 1);
  assert.equal(output.radius, 'LOCAL');
  assert.equal('reachProvenance' in output, false);
  assert.equal(
    output.reasons.some((reason: string) => /Document Service runtime reach/.test(reason)),
    false
  );
  assert.equal(
    calls.some(({ executable, args }) => executable === 'yarn' && args.includes('graph')),
    false
  );
});
