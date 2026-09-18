import assert from 'node:assert/strict';
import test from 'node:test';
import { changedRanges, readMergeChanges } from '../git-changes';
import { BlastRadiusError, ExitCode } from '../errors';

const nul = (...fields: string[]) => Buffer.from(`${fields.join('\0')}\0`, 'utf8');

test('reconciles NUL-delimited added, modified, deleted, renamed, binary and hostile paths', async () => {
  const hostile = 'packages/a/src/a $(not-command);|\nnext.ts';
  const result = await readMergeChanges(async ({ executable, args }) => {
    assert.equal(executable, 'git');
    assert.equal(args.at(-1), '--');
    assert.equal(args.includes('HEAD^1..HEAD'), true);
    assert.equal(args.includes('-z'), true);
    if (args.includes('--name-status')) {
      return {
        stdout: nul(
          'M',
          hostile,
          'D',
          'packages/a/src/old.ts',
          'R100',
          'old name.ts',
          'new name.ts',
          'A',
          'binary.png'
        ),
        stderr: '',
      };
    }
    return {
      stdout: nul(
        '4\t2\t' + hostile,
        '1\t0\tpackages/a/src/old.ts',
        '3\t1\t',
        'old name.ts',
        'new name.ts',
        '-\t-\tbinary.png'
      ),
      stderr: '',
    };
  });

  assert.deepEqual(result.files, [
    { path: 'binary.png', status: 'added', additions: null, deletions: null, binary: true },
    {
      path: 'new name.ts',
      previousPath: 'old name.ts',
      status: 'renamed',
      additions: 3,
      deletions: 1,
      binary: false,
    },
    {
      path: 'packages/a/src/a $(not-command);|\nnext.ts',
      status: 'modified',
      additions: 4,
      deletions: 2,
      binary: false,
    },
    { path: 'packages/a/src/old.ts', status: 'deleted', additions: 1, deletions: 0, binary: false },
  ]);
  assert.equal(result.additions, 8);
  assert.equal(result.deletions, 3);
  assert.equal(result.binaryFileCount, 1);
});

test('accepts an empty complete diff and rejects malformed/reconciliation-incomplete Git output', async () => {
  const empty = await readMergeChanges(async () => ({ stdout: Buffer.alloc(0), stderr: '' }));
  assert.deepEqual(empty, { files: [], additions: 0, deletions: 0, binaryFileCount: 0 });

  for (const transcript of [
    [nul('R100', 'only-old.ts'), nul('1\t0\tonly-old.ts')],
    [nul('C100', 'old.ts', 'new.ts'), nul('1\t0\told.ts')],
    [nul('M', '../escape.ts'), nul('1\t0\t../escape.ts')],
    [nul('M', 'a.ts'), nul('not-a-number\t0\ta.ts')],
    [nul('M', 'a.ts'), nul('1\t0\tb.ts')],
  ]) {
    let call = 0;
    await assert.rejects(
      () => readMergeChanges(async () => ({ stdout: transcript[call++]!, stderr: '' })),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.GitChanges
    );
  }
});

test('accepts valid deletion-only zero-context hunks as an unmappable semantic range', async () => {
  const ranges = await changedRanges(
    async () => ({
      stdout: '@@ -3,1 +3,0 @@\n-removed();\n',
      stderr: '',
    }),
    'packages/a/src/a.ts'
  );
  assert.deepEqual(ranges, []);
});

test('sorts supplementary-plane changed paths by Unicode code point rather than locale', async () => {
  const first = 'packages/\u{e000}/a.ts';
  const second = 'packages/\u{10000}/a.ts';
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = function (this: string, other: string) {
    return this < other ? 1 : this > other ? -1 : 0;
  } as typeof String.prototype.localeCompare;
  try {
    const changes = await readMergeChanges(async ({ args }) => ({
      stdout: args.includes('--name-status')
        ? nul('M', second, 'M', first)
        : nul(`1\t0\t${second}`, `1\t0\t${first}`),
      stderr: '',
    }));
    assert.deepEqual(
      changes.files.map((file) => file.path),
      [first, second]
    );
  } finally {
    String.prototype.localeCompare = original;
  }
});
