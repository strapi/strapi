import { BlastRadiusError, ExitCode } from './errors';
import { compareCodePoints } from './ordering';
import type { ChangedFile, CommandRunner } from './types';

const fail = (message: string): never => {
  throw new BlastRadiusError(ExitCode.GitChanges, message);
};
const text = (value: string | Buffer) => (Buffer.isBuffer(value) ? value.toString('utf8') : value);
const safePath = (path: string) =>
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  !path.includes('\0') &&
  path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
const fields = (value: string | Buffer) => {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (buffer.length === 0) return [];
  if (buffer.at(-1) !== 0) fail('Git returned malformed NUL-delimited change data.');
  return buffer.subarray(0, -1).toString('utf8').split('\0');
};

type StatusFile = Pick<ChangedFile, 'path' | 'previousPath' | 'status'>;
function parseStatus(value: string | Buffer): StatusFile[] {
  const input = fields(value);
  const result: StatusFile[] = [];
  for (let index = 0; index < input.length; ) {
    const status = input[index++];
    if (!status) fail('Git returned an empty file status.');
    if (status === 'A' || status === 'M' || status === 'D') {
      const path = input[index++];
      if (!path || !safePath(path)) fail('Git returned an invalid changed path.');
      result.push({
        path,
        status: status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted',
      });
    } else if (/^R\d{1,3}$/.test(status)) {
      const previousPath = input[index++];
      const path = input[index++];
      if (
        !previousPath ||
        !path ||
        !safePath(previousPath) ||
        !safePath(path) ||
        previousPath === path
      )
        fail('Git returned an invalid rename record.');
      result.push({ path, previousPath, status: 'renamed' });
    } else fail(`Git returned unsupported file status ${JSON.stringify(status)}.`);
  }
  if (new Set(result.map((file) => file.path)).size !== result.length)
    fail('Git returned duplicate changed paths.');
  return result;
}

type Stat = Pick<ChangedFile, 'path' | 'previousPath' | 'additions' | 'deletions' | 'binary'>;
function parseStats(value: string | Buffer): Stat[] {
  const input = fields(value);
  const result: Stat[] = [];
  for (let index = 0; index < input.length; ) {
    const record = input[index++];
    const parts = record?.split('\t');
    if (!record || !parts || parts.length !== 3) fail('Git returned malformed numstat data.');
    const [additionsText, deletionsText, firstPath] = parts;
    let previousPath: string | undefined;
    let path = firstPath;
    if (path === '') {
      previousPath = input[index++];
      path = input[index++];
    }
    if (
      !path ||
      !safePath(path) ||
      (previousPath !== undefined && (!safePath(previousPath) || previousPath === path))
    )
      fail('Git returned an invalid numstat path.');
    const binary = additionsText === '-' && deletionsText === '-';
    if (!binary && (!/^\d+$/.test(additionsText) || !/^\d+$/.test(deletionsText)))
      fail('Git returned invalid numstat counts.');
    result.push({
      path,
      previousPath,
      additions: binary ? null : Number(additionsText),
      deletions: binary ? null : Number(deletionsText),
      binary,
    });
  }
  if (new Set(result.map((file) => file.path)).size !== result.length)
    fail('Git returned duplicate numstat paths.');
  return result;
}

export async function readMergeChanges(runner: CommandRunner) {
  const args = [
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--find-renames',
    '-z',
    'HEAD^1..HEAD',
    '--',
  ];
  let statusOutput;
  let statOutput;
  try {
    [statusOutput, statOutput] = await Promise.all([
      runner({
        executable: 'git',
        args: [
          'diff',
          '--no-ext-diff',
          '--no-textconv',
          '--find-renames',
          '--name-status',
          '-z',
          'HEAD^1..HEAD',
          '--',
        ],
      }),
      runner({
        executable: 'git',
        args: [
          'diff',
          '--no-ext-diff',
          '--no-textconv',
          '--find-renames',
          '--numstat',
          '-z',
          'HEAD^1..HEAD',
          '--',
        ],
      }),
    ]);
  } catch {
    fail('Git could not read the merge diff.');
  }
  void args;
  const statuses = parseStatus(statusOutput!.stdout);
  const stats = parseStats(statOutput!.stdout);
  if (statuses.length !== stats.length) fail('Git status and statistics records do not reconcile.');
  const statByKey = new Map(
    stats.map((stat) => [`${stat.previousPath ?? ''}\0${stat.path}`, stat])
  );
  const files = statuses
    .map((status) => {
      const stat = statByKey.get(`${status.previousPath ?? ''}\0${status.path}`);
      if (!stat) fail('Git status and statistics records do not reconcile.');
      return {
        ...status,
        additions: stat!.additions,
        deletions: stat!.deletions,
        binary: stat!.binary,
      };
    })
    .sort((a, b) => compareCodePoints(a.path, b.path));
  const additions = files.reduce((sum, file) => sum + (file.additions ?? 0), 0);
  const deletions = files.reduce((sum, file) => sum + (file.deletions ?? 0), 0);
  return {
    files,
    additions,
    deletions,
    binaryFileCount: files.filter((file) => file.binary).length,
  };
}

export async function changedRanges(
  runner: CommandRunner,
  path: string
): Promise<Array<{ start: number; end: number }>> {
  try {
    const result = await runner({
      executable: 'git',
      args: ['diff', '--no-ext-diff', '--no-textconv', '--unified=0', 'HEAD^1..HEAD', '--', path],
    });
    const output = text(result.stdout);
    const ranges: Array<{ start: number; end: number }> = [];
    for (const match of output.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(match[1]);
      const count = match[2] === undefined ? 1 : Number(match[2]);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) || count < 0)
        fail('Git returned an incomplete changed hunk.');
      if (count > 0) ranges.push({ start: start - 1, end: start - 1 + count });
    }
    return ranges;
  } catch (error) {
    if (error instanceof BlastRadiusError) throw error;
    return fail('Git could not read changed hunks.');
  }
}
