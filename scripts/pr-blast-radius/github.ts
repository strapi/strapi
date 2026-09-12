import { BlastRadiusError, ExitCode } from './errors';
import type { ChangedFile, CommandRunner, PullRequestSnapshot } from './types';
export const GITHUB_MAX_PR_FILES = 3000;
const headers = [
  '--method',
  'GET',
  '--header',
  'Accept: application/vnd.github+json',
  '--header',
  'X-GitHub-Api-Version: 2022-11-28',
];
const validPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  !value.includes('\0') &&
  value.split('/').every((segment) => segment && segment !== '.' && segment !== '..');
const validSha = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[a-f\d]{40}$/i.test(value) ? value.toLowerCase() : undefined;
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
async function request(runner: CommandRunner, endpoint: string) {
  let stdout: string;
  try {
    ({ stdout } = await runner({
      executable: 'gh',
      args: ['api', ...headers, endpoint],
      cwd: process.cwd(),
    }));
  } catch (error) {
    throw new BlastRadiusError(
      ExitCode.GitHub,
      `gh api could not retrieve pull request data; check authentication and access (${error instanceof Error ? error.message.slice(0, 160) : 'command failure'}).`
    );
  }
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned malformed JSON; retry the command.'
    );
  }
}
function parseMetadata(value: unknown, number: number): Omit<PullRequestSnapshot, 'files'> {
  const data = value as Record<string, unknown>;
  const base = data?.base as Record<string, unknown>;
  const head = data?.head as Record<string, unknown>;
  const repo = base?.repo as Record<string, unknown>;
  const baseSha = validSha(base?.sha);
  const headSha = validSha(head?.sha);
  if (
    !data ||
    typeof data !== 'object' ||
    data.number !== number ||
    (data.state !== 'open' && data.state !== 'closed') ||
    typeof data.merged !== 'boolean' ||
    (data.merged && data.state !== 'closed') ||
    typeof base?.ref !== 'string' ||
    !base.ref ||
    !baseSha ||
    !headSha ||
    typeof repo?.full_name !== 'string' ||
    repo.full_name.toLowerCase() !== 'strapi/strapi' ||
    !integer(data.additions) ||
    !integer(data.deletions) ||
    !integer(data.changed_files)
  )
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned malformed or incomplete pull request metadata.'
    );
  return {
    number,
    state: data.state,
    merged: data.merged,
    base: { branch: base.ref, sha: baseSha },
    head: { sha: headSha },
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
  };
}
function parseFile(value: unknown): ChangedFile {
  const data = value as Record<string, unknown>;
  if (
    !data ||
    typeof data !== 'object' ||
    !validPath(data.filename) ||
    !['added', 'removed', 'modified', 'renamed'].includes(data.status as string)
  )
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned an invalid changed-file record.'
    );
  if (data.status === 'renamed') {
    if (!validPath(data.previous_filename) || data.previous_filename === data.filename)
      throw new BlastRadiusError(
        ExitCode.IncompletePullRequest,
        'GitHub returned an incomplete rename record.'
      );
    return { path: data.filename, previousPath: data.previous_filename, status: 'renamed' };
  }
  if (data.previous_filename !== undefined)
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned an unexpected previous filename.'
    );
  return { path: data.filename, status: data.status as ChangedFile['status'] };
}
export async function retrievePullRequest(
  runner: CommandRunner,
  number: number
): Promise<PullRequestSnapshot> {
  const endpoint = `/repos/strapi/strapi/pulls/${number}`;
  let initial: Omit<PullRequestSnapshot, 'files'>;
  try {
    initial = parseMetadata(await request(runner, endpoint), number);
  } catch (error) {
    if (error instanceof BlastRadiusError) throw error;
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned malformed pull request data.'
    );
  }
  if (initial.changedFiles > GITHUB_MAX_PR_FILES)
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      `GitHub changed-file count exceeds ${GITHUB_MAX_PR_FILES}; completeness cannot be proven.`
    );
  const files: ChangedFile[] = [];
  const pages = Math.max(1, Math.ceil(initial.changedFiles / 100));
  for (let page = 1; page <= pages; page += 1) {
    let values: unknown;
    try {
      values = await request(runner, `${endpoint}/files?per_page=100&page=${page}`);
    } catch (error) {
      if (error instanceof BlastRadiusError) throw error;
      throw new BlastRadiusError(
        ExitCode.IncompletePullRequest,
        'GitHub returned malformed changed-file data.'
      );
    }
    const expected = page === pages ? initial.changedFiles - (page - 1) * 100 : 100;
    if (!Array.isArray(values) || values.length !== expected)
      throw new BlastRadiusError(
        ExitCode.IncompletePullRequest,
        'GitHub changed-file pages are incomplete or truncated.'
      );
    files.push(...values.map(parseFile));
  }
  if (
    files.length !== initial.changedFiles ||
    new Set(files.map((file) => file.path)).size !== files.length
  )
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub changed-file records are incomplete or duplicated.'
    );
  let current: Omit<PullRequestSnapshot, 'files'>;
  try {
    current = parseMetadata(await request(runner, endpoint), number);
  } catch (error) {
    if (error instanceof BlastRadiusError) throw error;
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'GitHub returned malformed pull request data.'
    );
  }
  if (JSON.stringify(initial) !== JSON.stringify(current))
    throw new BlastRadiusError(
      ExitCode.IncompletePullRequest,
      'Pull request changed during retrieval; retry the command.'
    );
  return { ...initial, files };
}
