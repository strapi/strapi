import { BlastRadiusError, ExitCode } from './errors';
import type { ActionContext, CommandRunner } from './types';

type Env = Readonly<Record<string, string | undefined>>;
type ReadEvent = () => Promise<string>;
const sha = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[a-fA-F0-9]{40}$/.test(value) ? value.toLowerCase() : undefined;

const fail = (message: string): never => {
  throw new BlastRadiusError(
    ExitCode.ActionContext,
    `${message} Re-run from the pull-request merge checkout.`
  );
};

export async function validateActionContext(input: {
  env?: Env;
  readEvent?: ReadEvent;
  runner: CommandRunner;
}): Promise<ActionContext> {
  const env = input.env ?? process.env;
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'pull_request')
    fail('Blast radius requires an ordinary pull_request Action event.');
  if (env.GITHUB_REPOSITORY !== 'strapi/strapi') fail('Blast radius supports only strapi/strapi.');
  const refMatch = /^refs\/pull\/([1-9]\d*)\/merge$/.exec(env.GITHUB_REF ?? '');
  if (!refMatch) fail('GITHUB_REF must be the pull-request merge ref.');
  const refNumber = Number(refMatch?.[1]);
  let event: unknown;
  try {
    event = JSON.parse(
      await (
        input.readEvent ??
        (async () => {
          const { readFile } = await import('node:fs/promises');
          return readFile(env.GITHUB_EVENT_PATH ?? '', 'utf8');
        })
      )()
    );
  } catch {
    fail('The pull-request event payload is unreadable.');
  }
  const data = event as {
    number?: unknown;
    repository?: { full_name?: unknown };
    pull_request?: {
      merge_commit_sha?: unknown;
      base?: { sha?: unknown };
      head?: { sha?: unknown };
    };
  };
  const pr = data?.pull_request;
  const number = data?.number;
  const merge = sha(pr?.merge_commit_sha);
  const base = sha(pr?.base?.sha);
  const head = sha(pr?.head?.sha);
  const githubSha = sha(env.GITHUB_SHA);
  if (
    data?.repository?.full_name !== 'strapi/strapi' ||
    typeof number !== 'number' ||
    number !== refNumber ||
    !Number.isSafeInteger(number) ||
    !merge ||
    !base ||
    !head ||
    !githubSha
  )
    fail('The event payload does not match the pull-request merge checkout.');
  let line = '';
  try {
    line = Buffer.from(
      (
        await input.runner({
          executable: 'git',
          args: ['rev-list', '--parents', '-n', '1', 'HEAD'],
        })
      ).stdout
    )
      .toString('utf8')
      .trim();
  } catch {
    fail('Git could not inspect the merge commit.');
  }
  const parents = line.split(/\s+/).map((value) => sha(value));
  if (parents.length !== 3 || parents.some((value) => !value))
    fail('The checked-out commit must have exactly two parents.');
  if (parents[0] !== merge || merge !== githubSha || parents[1] !== base || parents[2] !== head)
    fail('The checked-out merge commit does not match the event revisions.');
  return {
    repository: 'strapi/strapi',
    pullRequest: number as number,
    mergeRevision: merge as string,
    baseRevision: base as string,
    headRevision: head as string,
  };
}
