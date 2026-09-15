import assert from 'node:assert/strict';
import test from 'node:test';
import { retrievePullRequest } from '../github';
import { BlastRadiusError, ExitCode } from '../errors';
import type { CommandRunner } from '../types';

const sha = 'a'.repeat(40);
const metadata = (overrides: Record<string, unknown> = {}) => ({
  number: 12,
  state: 'open',
  merged: false,
  base: { ref: 'develop', sha, repo: { full_name: 'strapi/strapi' } },
  head: { sha: 'B'.repeat(40) },
  additions: 3,
  deletions: 1,
  changed_files: 3,
  ...overrides,
});
function transcript(
  meta: unknown = metadata(),
  files: unknown = [
    { filename: 'src/a.ts', status: 'added' },
    { filename: 'src/old.ts', status: 'removed' },
    { filename: 'src/new.ts', previous_filename: 'src/previous.ts', status: 'renamed' },
  ]
) {
  const calls: Array<{ executable: string; args: readonly string[] }> = [];
  const runner: CommandRunner = async (request) => {
    calls.push(request);
    const endpoint = request.args.at(-1);
    return { stdout: JSON.stringify(endpoint?.includes('/files?') ? files : meta), stderr: '' };
  };
  return { runner, calls };
}

test('retrieves complete open and fork-originated metadata with exact read-only gh arguments', async () => {
  const { runner, calls } = transcript();
  const result = await retrievePullRequest(runner, 12);
  assert.equal(result.head.sha, 'b'.repeat(40));
  assert.deepEqual(result.files[2], {
    path: 'src/new.ts',
    previousPath: 'src/previous.ts',
    status: 'renamed',
  });
  assert.deepEqual(calls[0].args, [
    'api',
    '--method',
    'GET',
    '--header',
    'Accept: application/vnd.github+json',
    '--header',
    'X-GitHub-Api-Version: 2022-11-28',
    '/repos/strapi/strapi/pulls/12',
  ]);
  assert.equal(
    calls.every((call) => call.executable === 'gh' && call.args.includes('GET')),
    true
  );
});
test('accepts closed merged and closed unmerged PR metadata', async () => {
  for (const value of [
    metadata({ state: 'closed', merged: true }),
    metadata({ state: 'closed', merged: false }),
  ])
    assert.equal((await retrievePullRequest(transcript(value).runner, 12)).state, 'closed');
});
test('rejects malformed metadata, paths, statuses, duplicates, and command failure in distinct categories', async () => {
  for (const [meta, files] of [
    [metadata({ additions: '3' }), undefined],
    [metadata(), [{ filename: '../bad.ts', status: 'added' }]],
    [metadata(), [{ filename: 'a', status: 'copied' }]],
    [
      metadata({ changed_files: 2 }),
      [
        { filename: 'a', status: 'added' },
        { filename: 'a', status: 'modified' },
      ],
    ],
  ])
    await assert.rejects(
      () => retrievePullRequest(transcript(meta, files as never).runner, 12),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.IncompletePullRequest
    );
  const failing: CommandRunner = async () => {
    throw new Error('authentication failed');
  };
  await assert.rejects(
    () => retrievePullRequest(failing, 12),
    (error: unknown) => error instanceof BlastRadiusError && error.exitCode === ExitCode.GitHub
  );
});
test('pagination count limit snapshot and empty PR completeness', async () => {
  const empty = metadata({ changed_files: 0 });
  const emptyCalls: string[] = [];
  await retrievePullRequest(async (request) => {
    const endpoint = request.args.at(-1)!;
    emptyCalls.push(endpoint);
    return { stdout: JSON.stringify(endpoint.includes('/files?') ? [] : empty), stderr: '' };
  }, 12);
  assert.equal(emptyCalls.filter((endpoint) => endpoint.includes('/files?')).length, 1);
  await assert.rejects(
    () => retrievePullRequest(transcript(metadata({ changed_files: 3001 }), []).runner, 12),
    (error: unknown) =>
      error instanceof BlastRadiusError && error.exitCode === ExitCode.IncompletePullRequest
  );
  const malformed: CommandRunner = async () => ({ stdout: '{', stderr: '' });
  await assert.rejects(
    () => retrievePullRequest(malformed, 12),
    (error: unknown) =>
      error instanceof BlastRadiusError && error.exitCode === ExitCode.IncompletePullRequest
  );
});

test('fetches every required page through the 3,000-file boundary and detects snapshot changes', async () => {
  const records = Array.from({ length: 3000 }, (_, index) => ({
    filename: `docs/${index}.md`,
    status: 'modified',
  }));
  const calls: string[] = [];
  await retrievePullRequest(async ({ args }) => {
    const endpoint = String(args.at(-1));
    calls.push(endpoint);
    if (!endpoint.includes('/files?'))
      return { stdout: JSON.stringify(metadata({ changed_files: 3000 })), stderr: '' };
    const page = Number(new URL(`https://example.test${endpoint}`).searchParams.get('page'));
    return { stdout: JSON.stringify(records.slice((page - 1) * 100, page * 100)), stderr: '' };
  }, 12);
  assert.equal(calls.filter((endpoint) => endpoint.includes('/files?')).length, 30);
  let metadataCalls = 0;
  await assert.rejects(
    () =>
      retrievePullRequest(async ({ args }) => {
        const endpoint = String(args.at(-1));
        if (endpoint.includes('/files?'))
          return {
            stdout: JSON.stringify([{ filename: 'docs/a.md', status: 'modified' }]),
            stderr: '',
          };
        metadataCalls += 1;
        return {
          stdout: JSON.stringify(
            metadata({ changed_files: 1, additions: metadataCalls === 1 ? 1 : 2 })
          ),
          stderr: '',
        };
      }, 12),
    (error: unknown) =>
      error instanceof BlastRadiusError && error.exitCode === ExitCode.IncompletePullRequest
  );
});

test('requires exact two-page file transcripts and rejects malformed file evidence', async () => {
  const twoPages = Array.from({ length: 101 }, (_, index) => ({
    filename: `docs/${index}.md`,
    status: 'modified',
  }));
  const calls: string[] = [];
  await retrievePullRequest(async ({ args }) => {
    const endpoint = String(args.at(-1));
    calls.push(endpoint);
    if (!endpoint.includes('/files?'))
      return { stdout: JSON.stringify(metadata({ changed_files: 101 })), stderr: '' };
    const page = Number(new URL(`https://example.test${endpoint}`).searchParams.get('page'));
    return { stdout: JSON.stringify(twoPages.slice((page - 1) * 100, page * 100)), stderr: '' };
  }, 12);
  assert.deepEqual(
    calls
      .filter((value) => value.includes('/files?'))
      .map((value) => value.slice(value.indexOf('?'))),
    ['?per_page=100&page=1', '?per_page=100&page=2']
  );
  for (const files of [
    twoPages.slice(0, 99),
    [...twoPages, { filename: 'docs/extra.md', status: 'modified' }],
  ]) {
    await assert.rejects(
      () => retrievePullRequest(transcript(metadata({ changed_files: 101 }), files).runner, 12),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.IncompletePullRequest
    );
  }
  const malformedFiles: Array<[Record<string, unknown>, string]> = [
    [{ filename: '/absolute.ts', status: 'added' }, 'invalid changed-file record'],
    [{ filename: 'a.ts', status: 'copied' }, 'invalid changed-file record'],
    [{ filename: 'a.ts', status: 'renamed' }, 'incomplete rename record'],
    [
      { filename: 'a.ts', status: 'renamed', previous_filename: '../old.ts' },
      'incomplete rename record',
    ],
  ];
  for (const [file, diagnostic] of malformedFiles) {
    await assert.rejects(
      () => retrievePullRequest(transcript(metadata({ changed_files: 1 }), [file]).runner, 12),
      (error: unknown) =>
        error instanceof BlastRadiusError &&
        error.exitCode === ExitCode.IncompletePullRequest &&
        error.message.includes(diagnostic)
    );
  }
});
