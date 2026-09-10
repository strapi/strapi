import assert from 'node:assert/strict';
import test from 'node:test';
import { run } from '../app';
import { createResult, renderHuman, renderJson, renderMarkdown } from '../format';
import { runSummary } from '../summary';

const resultInput = {
  context: {
    repository: 'strapi/strapi',
    pullRequest: 27557,
    mergeRevision: 'c'.repeat(40),
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
  },
  changes: {
    files: [
      {
        path: '.github/workflows/blast-radius.yml',
        status: 'added',
        additions: 1,
        deletions: 0,
        binary: false,
      },
    ],
    additions: 1,
    deletions: 0,
    binaryFileCount: 0,
  },
  totalProjects: ['z', 'a'],
  prWideProjects: ['z'],
  semanticProjects: [],
  fallbackPaths: [],
  affectedProjects: [],
  pathEvidence: [
    {
      path: '.github/workflows/blast-radius.yml',
      decision: 'non-runtime',
      nxProjects: [],
      semanticProjects: [],
      finalProjects: [],
      reasonCodes: ['non-runtime'],
      declarations: [],
      references: [],
    },
  ],
  radius: 'NON_RUNTIME',
  sensitivitySignals: ['workflow-changes'],
  reasons: ['All changed paths are recognized non-runtime'],
  warnings: [],
};

test('renders deterministic v2 JSON with auditable path evidence and advisory output', () => {
  const result = createResult(resultInput);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.classifierVersion, 2);
  assert.deepEqual(result.affectedProjects, []);
  assert.equal(
    renderJson(result),
    renderJson(createResult({ ...resultInput, totalProjects: ['a', 'z'] }))
  );
  assert.match(renderHuman(result), /Nx-bounded static reach/);
  assert.match(renderMarkdown(result), /advisory/);
  assert.match(renderMarkdown(result), /PR merge checkout/);
});

test('uses code-point ordering rather than host locale ordering for every unordered v2 array', () => {
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = function (this: string, other: string) {
    return this < other ? 1 : this > other ? -1 : 0;
  } as typeof String.prototype.localeCompare;
  try {
    const result = createResult({
      ...resultInput,
      totalProjects: ['ä', 'z', 'a'],
      prWideProjects: ['ä', 'z', 'a'],
      semanticProjects: ['ä', 'z', 'a'],
      fallbackPaths: ['ä.ts', 'z.ts', 'a.ts'],
      affectedProjects: ['ä', 'z', 'a'],
      changes: {
        ...resultInput.changes,
        files: [
          { path: 'ä.ts', status: 'added', additions: 1, deletions: 0, binary: false },
          { path: 'z.ts', status: 'added', additions: 1, deletions: 0, binary: false },
          { path: 'a.ts', status: 'added', additions: 1, deletions: 0, binary: false },
        ],
      },
      pathEvidence: ['ä.ts', 'z.ts', 'a.ts'].map((path) => ({
        path,
        decision: 'non-runtime',
        nxProjects: [],
        semanticProjects: [],
        finalProjects: [],
        reasonCodes: [],
        declarations: [],
        references: [],
      })),
      sensitivitySignals: ['ä', 'z', 'a'],
      reasons: ['ä', 'z', 'a'],
      warnings: ['ä', 'z', 'a'],
    });
    assert.deepEqual(result.totalProjects, ['a', 'z', 'ä']);
    assert.deepEqual(result.fallbackPaths, ['a.ts', 'z.ts', 'ä.ts']);
    assert.deepEqual(
      result.changedFiles.map((file) => file.path),
      ['a.ts', 'z.ts', 'ä.ts']
    );
    assert.deepEqual(
      result.pathEvidence.map((item) => item.path),
      ['a.ts', 'z.ts', 'ä.ts']
    );
    assert.equal(
      renderJson(result),
      renderJson(
        createResult({
          ...resultInput,
          totalProjects: ['z', 'ä', 'a'],
          prWideProjects: ['z', 'ä', 'a'],
          semanticProjects: ['z', 'ä', 'a'],
          fallbackPaths: ['z.ts', 'ä.ts', 'a.ts'],
          affectedProjects: ['z', 'ä', 'a'],
          changes: {
            ...resultInput.changes,
            files: [
              { path: 'z.ts', status: 'added', additions: 1, deletions: 0, binary: false },
              { path: 'a.ts', status: 'added', additions: 1, deletions: 0, binary: false },
              { path: 'ä.ts', status: 'added', additions: 1, deletions: 0, binary: false },
            ],
          },
          pathEvidence: ['z.ts', 'a.ts', 'ä.ts'].map((path) => ({
            path,
            decision: 'non-runtime',
            nxProjects: [],
            semanticProjects: [],
            finalProjects: [],
            reasonCodes: [],
            declarations: [],
            references: [],
          })),
          sensitivitySignals: ['z', 'ä', 'a'],
          reasons: ['z', 'ä', 'a'],
          warnings: ['z', 'ä', 'a'],
        })
      )
    );
  } finally {
    String.prototype.localeCompare = original;
  }
});

test('summary rejects version-only and malformed v2-shaped objects without Markdown output', async () => {
  for (const invalid of [
    { schemaVersion: 2, classifierVersion: 2 },
    { schemaVersion: 2, classifierVersion: 2, repository: 'strapi/strapi', pullRequest: '1' },
    { ...createResult(resultInput), affectedProjectCount: 1, affectedProjects: [] },
  ]) {
    const outcome = await runSummary(['result.json'], async () => JSON.stringify(invalid));
    assert.equal(outcome.exitCode, 1);
    assert.equal(outcome.stdout, '');
    assert.match(outcome.stderr, /structurally usable/);
  }
});

test('summary rejects hostile radius text rather than interpolating Markdown', async () => {
  const outcome = await runSummary(['result.json'], async () =>
    JSON.stringify({ ...createResult(resultInput), radius: 'NON_RUNTIME\n\n## injected' })
  );
  assert.equal(outcome.exitCode, 1);
  assert.equal(outcome.stdout, '');
  assert.match(outcome.stderr, /structurally usable/);
});

test('renders complete, safe human and Markdown advisory reports without changing JSON', () => {
  const hostileProject = '@scope/project\n## injected\u0007\u2028line-separator';
  const hostileSignal = 'workflow-changes\n```injected\u2029paragraph-separator';
  const hostileReason = 'Changed `path`\n## injected\u202ereversed';
  const hostilePath = 'packages/a/line\n## injected\u2028path.ts';
  const result = createResult({
    ...resultInput,
    radius: 'MULTI_PACKAGE',
    changes: {
      files: [
        {
          path: hostilePath,
          status: 'modified',
          additions: 12,
          deletions: 3,
          binary: false,
        },
        { path: 'packages/z/a.ts', status: 'added', additions: 1, deletions: 0, binary: false },
      ],
      additions: 13,
      deletions: 3,
      binaryFileCount: 0,
    },
    totalProjects: ['@scope/a', '@scope/b', '@scope/c', '@scope/d'],
    prWideProjects: ['@scope/a', '@scope/b', '@scope/c'],
    semanticProjects: ['@scope/a'],
    fallbackPaths: [hostilePath],
    affectedProjects: [hostileProject, '@scope/a'],
    pathEvidence: [
      {
        path: hostilePath,
        decision: 'nx-fallback',
        nxProjects: ['@scope/a', '@scope/b'],
        semanticProjects: [],
        finalProjects: ['@scope/a', '@scope/b'],
        reasonCodes: ['module-resolution-incomplete'],
        declarations: [],
        references: [],
      },
      {
        path: 'packages/z/a.ts',
        decision: 'narrowed',
        nxProjects: ['@scope/a'],
        semanticProjects: ['@scope/a'],
        finalProjects: ['@scope/a'],
        reasonCodes: ['semantic-proof'],
        declarations: [],
        references: [],
      },
    ],
    sensitivitySignals: [hostileSignal],
    reasons: [hostileReason],
    warnings: [],
  });
  const json = renderJson(result);
  const reports = [renderHuman(result), renderMarkdown(result)];

  assert.equal(json, `${JSON.stringify(result)}\n`);
  for (const report of reports) {
    assert.match(report, /strapi\/strapi#27557/);
    assert.match(report, /MULTI_PACKAGE/);
    assert.match(report, /Changed files:\s*2/i);
    assert.match(report, /Additions\/deletions:\s*\+13\/-3/i);
    assert.match(report, /2\/4/);
    assert.match(report, /3\/4/);
    assert.match(report, /Affected[\s\S]*@scope\/a/);
    assert.match(report, /Workflow changes/);
    assert.match(report, /Changed `path`/);
    assert.match(report, /narrowed.*1/i);
    assert.match(report, /fallback.*1/i);
    assert.match(report, /Merge revision:[\s\S]*ccccccc/i);
    assert.match(report, /Base revision:[\s\S]*aaaaaaa/i);
    assert.match(report, /Head revision:[\s\S]*bbbbbbb/i);
    assert.match(report, /advisory/i);
    assert.match(report, /Classifier version: 2/i);
    assert.doesNotMatch(report, /## injected|```injected/);
    assert.equal(report.includes('\u0007'), false);
    assert.equal(report.includes('\u2028'), false);
    assert.equal(report.includes('\u2029'), false);
    assert.equal(report.includes('\u202e'), false);
    assert.match(report, /\\n/);
    assert.match(report, /\\u2028/);
    assert.match(report, /\\u2029/);
    assert.match(report, /\\u202e/);
  }
});

test('renders empty human and Markdown collections as None', () => {
  const result = createResult({
    ...resultInput,
    sensitivitySignals: [],
    reasons: [],
    affectedProjects: [],
    fallbackPaths: [],
    pathEvidence: [],
  });
  for (const report of [renderHuman(result), renderMarkdown(result)]) {
    assert.match(report, /Affected[\s\S]*None/);
    assert.match(report, /Sensitivity[\s\S]*None/);
    assert.match(report, /Reasons[\s\S]*None/);
    assert.match(report, /Fallback[\s\S]*None/);
  }
});

test('maps all boundary failures to empty JSON stdout and preserves semantic fallback as success', async () => {
  const invalid = await run(['27557', '--json'], {
    runner: async () => ({ stdout: '', stderr: '' }),
  });
  assert.equal(invalid.exitCode, 2);
  assert.equal(invalid.stdout, '');

  const fallBack = await run(['--json'], {
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: 'strapi/strapi',
      GITHUB_REF: 'refs/pull/1/merge',
      GITHUB_SHA: 'c'.repeat(40),
    },
    readEvent: async () =>
      JSON.stringify({
        number: 1,
        repository: { full_name: 'strapi/strapi' },
        pull_request: {
          merge_commit_sha: 'c'.repeat(40),
          base: { sha: 'a'.repeat(40) },
          head: { sha: 'b'.repeat(40) },
        },
      }),
    runner: async ({ executable, args }) => {
      if (executable === 'git' && args[0] === 'rev-list') {
        return { stdout: `${'c'.repeat(40)} ${'a'.repeat(40)} ${'b'.repeat(40)}\n`, stderr: '' };
      }
      if (executable === 'git' && args.includes('--name-status')) {
        return { stdout: Buffer.from('M\0packages/a/src/a.ts\0'), stderr: '' };
      }
      if (executable === 'git' && args.includes('--numstat')) {
        return { stdout: Buffer.from('1\t0\tpackages/a/src/a.ts\0'), stderr: '' };
      }
      if (executable === 'git' && args.includes('--unified=0')) {
        return { stdout: '@@ -1 +1 @@\n', stderr: '' };
      }
      if (executable === 'yarn' && args.includes('graph')) {
        return {
          stdout: JSON.stringify({
            graph: {
              nodes: { a: { data: { root: 'packages/a' } } },
              dependencies: { a: [] },
            },
          }),
          stderr: '',
        };
      }
      if (executable === 'yarn' && args.includes('--affected'))
        return { stdout: '["a"]', stderr: '' };
      if (executable === 'yarn') return { stdout: '["a"]', stderr: '' };
      throw new Error(`Unexpected command: ${executable} ${args.join(' ')}`);
    },
    temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
  });
  assert.equal(fallBack.exitCode, 0);
  assert.match(fallBack.stdout, /"decision":"nx-fallback"/);
  assert.doesNotMatch(fallBack.stdout, /human-readable/i);
});

test('loads eligible checked-out workspace sources into semantic analysis so it can narrow', async () => {
  const sourceCalls: unknown[] = [];
  const outcome = await run(['--json'], {
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: 'strapi/strapi',
      GITHUB_REF: 'refs/pull/1/merge',
      GITHUB_SHA: 'c'.repeat(40),
    },
    readEvent: async () =>
      JSON.stringify({
        number: 1,
        repository: { full_name: 'strapi/strapi' },
        pull_request: {
          merge_commit_sha: 'c'.repeat(40),
          base: { sha: 'a'.repeat(40) },
          head: { sha: 'b'.repeat(40) },
        },
      }),
    loadWorkspaceSources: async (request: unknown) => {
      sourceCalls.push(request);
      return {
        'packages/a/src/a.ts': '\n\nexport function changed() { return 1; }\n',
        'packages/b/src/use.ts': 'import { changed } from "../../a/src/a";\nchanged();\n',
      };
    },
    runner: async ({ executable, args }) => {
      if (executable === 'git' && args[0] === 'rev-list')
        return { stdout: `${'c'.repeat(40)} ${'a'.repeat(40)} ${'b'.repeat(40)}\n`, stderr: '' };
      if (executable === 'git' && args.includes('--name-status'))
        return { stdout: Buffer.from('M\0packages/a/src/a.ts\0'), stderr: '' };
      if (executable === 'git' && args.includes('--numstat'))
        return { stdout: Buffer.from('1\t0\tpackages/a/src/a.ts\0'), stderr: '' };
      if (executable === 'git' && args.includes('--unified=0'))
        return { stdout: '@@ -3 +3 @@\n', stderr: '' };
      if (executable === 'yarn' && args.includes('graph'))
        return {
          stdout: JSON.stringify({
            graph: {
              nodes: { a: { data: { root: 'packages/a' } }, b: { data: { root: 'packages/b' } } },
              dependencies: { a: [], b: [{ target: 'a' }] },
            },
          }),
          stderr: '',
        };
      if (executable === 'yarn' && args.includes('--affected'))
        return { stdout: '["a","b"]', stderr: '' };
      if (executable === 'yarn') return { stdout: '["a","b"]', stderr: '' };
      throw new Error(`Unexpected command: ${executable} ${args.join(' ')}`);
    },
    temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
  });

  assert.equal(outcome.exitCode, 0);
  assert.equal(sourceCalls.length, 1);
  assert.match(outcome.stdout, /"decision":"narrowed"/);
  assert.doesNotMatch(outcome.stdout, /missing-source/);
  assert.match(outcome.stdout, /"affectedProjects":\["a","b"\]/);
});

test('records source-load-incomplete and retains Nx reach when any requested source set is unreadable', async () => {
  for (const unreadable of ['root', 'directory', 'file']) {
    const outcome = await run(['--json'], {
      env: {
        GITHUB_ACTIONS: 'true',
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_REPOSITORY: 'strapi/strapi',
        GITHUB_REF: 'refs/pull/1/merge',
        GITHUB_SHA: 'c'.repeat(40),
      },
      readEvent: async () =>
        JSON.stringify({
          number: 1,
          repository: { full_name: 'strapi/strapi' },
          pull_request: {
            merge_commit_sha: 'c'.repeat(40),
            base: { sha: 'a'.repeat(40) },
            head: { sha: 'b'.repeat(40) },
          },
        }),
      loadWorkspaceSources: async () => ({
        files: {
          'packages/a/src/a.ts': '\n\nexport function changed() { return 1; }\n',
        },
        complete: false,
        unreadable,
      }),
      runner: async ({ executable, args }) => {
        if (executable === 'git' && args[0] === 'rev-list') {
          return {
            stdout: `${'c'.repeat(40)} ${'a'.repeat(40)} ${'b'.repeat(40)}\n`,
            stderr: '',
          };
        }
        if (executable === 'git' && args.includes('--name-status')) {
          return { stdout: Buffer.from('M\0packages/a/src/a.ts\0'), stderr: '' };
        }
        if (executable === 'git' && args.includes('--numstat')) {
          return { stdout: Buffer.from('1\t0\tpackages/a/src/a.ts\0'), stderr: '' };
        }
        if (executable === 'git' && args.includes('--unified=0')) {
          return { stdout: '@@ -3 +3 @@\n', stderr: '' };
        }
        if (executable === 'yarn' && args.includes('graph')) {
          return {
            stdout: JSON.stringify({
              graph: {
                nodes: {
                  a: { data: { root: 'packages/a' } },
                  b: { data: { root: 'packages/b' } },
                },
                dependencies: { a: [], b: [{ target: 'a' }] },
              },
            }),
            stderr: '',
          };
        }
        if (executable === 'yarn' && args.includes('--affected')) {
          return { stdout: '["a","b"]', stderr: '' };
        }
        if (executable === 'yarn') return { stdout: '["a","b"]', stderr: '' };
        throw new Error(`Unexpected command: ${executable} ${args.join(' ')}`);
      },
      temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
    });
    assert.equal(outcome.exitCode, 0, unreadable);
    assert.match(outcome.stdout, /"decision":"nx-fallback"/, unreadable);
    assert.match(outcome.stdout, /source-load-incomplete/, unreadable);
    assert.match(outcome.stdout, /"affectedProjects":\["a","b"\]/, unreadable);
  }
});

async function runRename(previousPath: string, path: string) {
  return run(['--json'], {
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: 'strapi/strapi',
      GITHUB_REF: 'refs/pull/1/merge',
      GITHUB_SHA: 'c'.repeat(40),
    },
    readEvent: async () =>
      JSON.stringify({
        number: 1,
        repository: { full_name: 'strapi/strapi' },
        pull_request: {
          merge_commit_sha: 'c'.repeat(40),
          base: { sha: 'a'.repeat(40) },
          head: { sha: 'b'.repeat(40) },
        },
      }),
    runner: async ({ executable, args }) => {
      if (executable === 'git' && args[0] === 'rev-list')
        return { stdout: `${'c'.repeat(40)} ${'a'.repeat(40)} ${'b'.repeat(40)}\n`, stderr: '' };
      if (executable === 'git' && args.includes('--name-status'))
        return { stdout: Buffer.from(`R100\0${previousPath}\0${path}\0`), stderr: '' };
      if (executable === 'git' && args.includes('--numstat'))
        return { stdout: Buffer.from(`1\t1\t\0${previousPath}\0${path}\0`), stderr: '' };
      if (executable === 'yarn' && args.includes('graph'))
        return {
          stdout: JSON.stringify({
            graph: {
              nodes: { a: { data: { root: 'packages/a' } }, b: { data: { root: 'packages/b' } } },
              dependencies: { a: [], b: [] },
            },
          }),
          stderr: '',
        };
      if (executable === 'yarn' && args.includes('--affected') && args.includes('--base=HEAD^1'))
        return { stdout: '["a","b"]', stderr: '' };
      if (executable === 'yarn' && args.includes('--affected'))
        return {
          stdout: args.some((value) => value.includes('packages/a/')) ? '["a"]' : '["b"]',
          stderr: '',
        };
      if (executable === 'yarn') return { stdout: '["a","b"]', stderr: '' };
      throw new Error(`Unexpected command: ${executable} ${args.join(' ')}`);
    },
    temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
  });
}

test('reconciles both rename sides so category crossings never discard executable reach', async () => {
  const cases: Array<[string, string, string[]]> = [
    ['packages/a/src/api.ts', 'tests/api.ts', ['a']],
    ['packages/a/src/api.ts', '.github/api.ts', ['a']],
    ['tests/api.ts', 'packages/a/src/api.ts', ['a']],
    ['packages/a/src/api.ts', 'packages/b/src/api.ts', ['a', 'b']],
  ];
  for (const [previousPath, path, expectedProjects] of cases) {
    const outcome = await runRename(previousPath, path);
    assert.equal(outcome.exitCode, 0, `${previousPath} -> ${path}`);
    const result = JSON.parse(outcome.stdout) as {
      affectedProjects: string[];
      pathEvidence: Array<{ path: string; finalProjects: string[]; decision: string }>;
    };
    assert.deepEqual(result.affectedProjects, expectedProjects, `${previousPath} -> ${path}`);
    const evidence = result.pathEvidence.find((item) => item.path === path);
    assert.ok(evidence, `${previousPath} -> ${path}`);
    assert.deepEqual(evidence.finalProjects, expectedProjects, `${previousPath} -> ${path}`);
    assert.notEqual(evidence.decision, 'non-runtime', `${previousPath} -> ${path}`);
  }
});

test('treats a deletion-only hunk as a semantic Nx fallback, not corrupt Git data', async () => {
  const outcome = await run(['--json'], {
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: 'strapi/strapi',
      GITHUB_REF: 'refs/pull/1/merge',
      GITHUB_SHA: 'c'.repeat(40),
    },
    readEvent: async () =>
      JSON.stringify({
        number: 1,
        repository: { full_name: 'strapi/strapi' },
        pull_request: {
          merge_commit_sha: 'c'.repeat(40),
          base: { sha: 'a'.repeat(40) },
          head: { sha: 'b'.repeat(40) },
        },
      }),
    runner: async ({ executable, args }) => {
      if (executable === 'git' && args[0] === 'rev-list')
        return { stdout: `${'c'.repeat(40)} ${'a'.repeat(40)} ${'b'.repeat(40)}\n`, stderr: '' };
      if (executable === 'git' && args.includes('--name-status'))
        return { stdout: Buffer.from('M\0packages/a/src/a.ts\0'), stderr: '' };
      if (executable === 'git' && args.includes('--numstat'))
        return { stdout: Buffer.from('0\t1\tpackages/a/src/a.ts\0'), stderr: '' };
      if (executable === 'git' && args.includes('--unified=0'))
        return { stdout: '@@ -3,1 +3,0 @@\n', stderr: '' };
      if (executable === 'yarn' && args.includes('graph'))
        return {
          stdout: JSON.stringify({
            graph: { nodes: { a: { data: { root: 'packages/a' } } }, dependencies: { a: [] } },
          }),
          stderr: '',
        };
      if (executable === 'yarn' && args.includes('--affected'))
        return { stdout: '["a"]', stderr: '' };
      if (executable === 'yarn') return { stdout: '["a"]', stderr: '' };
      throw new Error(`Unexpected command: ${executable} ${args.join(' ')}`);
    },
    temp: { create: async () => '/tmp/blast-radius-test', remove: async () => undefined },
  });
  assert.equal(outcome.exitCode, 0);
  assert.match(outcome.stdout, /"decision":"nx-fallback"/);
  assert.match(outcome.stdout, /"affectedProjects":\["a"\]/);
});
