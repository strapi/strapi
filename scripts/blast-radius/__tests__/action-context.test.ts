import assert from 'node:assert/strict';
import test from 'node:test';
import { validateActionContext } from '../action-context';
import { BlastRadiusError, ExitCode } from '../errors';

const sha = (letter: string) => letter.repeat(40);
const payload = {
  number: 27557,
  repository: { full_name: 'strapi/strapi' },
  pull_request: {
    merge_commit_sha: sha('c'),
    base: { sha: sha('a') },
    head: { sha: sha('b') },
  },
};
const environment = {
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'pull_request',
  GITHUB_REPOSITORY: 'strapi/strapi',
  GITHUB_REF: 'refs/pull/27557/merge',
  GITHUB_SHA: sha('c'),
};

test('accepts only the validated two-parent PR merge checkout with argument-array Git calls', async () => {
  const calls: Array<{ executable: string; args: readonly string[] }> = [];
  const context = await validateActionContext({
    env: environment,
    readEvent: async () => JSON.stringify(payload),
    runner: async (request) => {
      calls.push(request);
      return { stdout: `${sha('c')} ${sha('a')} ${sha('b')}\n`, stderr: '' };
    },
  });

  assert.deepEqual(context, {
    repository: 'strapi/strapi',
    pullRequest: 27557,
    mergeRevision: sha('c'),
    baseRevision: sha('a'),
    headRevision: sha('b'),
  });
  assert.deepEqual(calls, [
    { executable: 'git', args: ['rev-list', '--parents', '-n', '1', 'HEAD'] },
  ]);
});

test('rejects invalid event contexts and parent identity mismatches with exit 3', async () => {
  const invalidCases = [
    {
      env: { ...environment, GITHUB_ACTIONS: 'false' },
      event: payload,
      parents: `${sha('c')} ${sha('a')} ${sha('b')}`,
    },
    {
      env: { ...environment, GITHUB_EVENT_NAME: 'push' },
      event: payload,
      parents: `${sha('c')} ${sha('a')} ${sha('b')}`,
    },
    {
      env: { ...environment, GITHUB_REPOSITORY: 'other/repo' },
      event: payload,
      parents: `${sha('c')} ${sha('a')} ${sha('b')}`,
    },
    {
      env: { ...environment, GITHUB_REF: 'refs/heads/develop' },
      event: payload,
      parents: `${sha('c')} ${sha('a')} ${sha('b')}`,
    },
    {
      env: environment,
      event: { ...payload, repository: { full_name: 'other/repo' } },
      parents: `${sha('c')} ${sha('a')} ${sha('b')}`,
    },
    { env: environment, event: payload, parents: `${sha('c')} ${sha('a')}` },
    {
      env: environment,
      event: payload,
      parents: `${sha('c')} ${sha('a')} ${sha('b')} ${sha('d')}`,
    },
    { env: environment, event: payload, parents: `${sha('d')} ${sha('a')} ${sha('b')}` },
  ];

  for (const value of invalidCases) {
    await assert.rejects(
      () =>
        validateActionContext({
          env: value.env,
          readEvent: async () => JSON.stringify(value.event),
          runner: async () => ({ stdout: `${value.parents}\n`, stderr: '' }),
        }),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.ActionContext
    );
  }
});

test('requires the webhook top-level PR number and rejects an invented nested-only number', async () => {
  const nestedOnly = {
    repository: { full_name: 'strapi/strapi' },
    pull_request: {
      number: 27557,
      merge_commit_sha: sha('c'),
      base: { sha: sha('a') },
      head: { sha: sha('b') },
    },
  };
  await assert.rejects(
    () =>
      validateActionContext({
        env: environment,
        readEvent: async () => JSON.stringify(nestedOnly),
        runner: async () => ({ stdout: `${sha('c')} ${sha('a')} ${sha('b')}\n`, stderr: '' }),
      }),
    (error: unknown) =>
      error instanceof BlastRadiusError && error.exitCode === ExitCode.ActionContext
  );
});
