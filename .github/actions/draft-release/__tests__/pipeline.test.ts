import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createJournal } from '../lib/journal.ts';
import { EXPERIMENTAL_LABEL, runDraftRelease } from '../lib/pipeline.ts';
import { renderBody } from '../lib/report.ts';
import { SHA } from '../lib/__fixtures__/fixtures.ts';

import type { RegistryRequest } from '../lib/npm.ts';
import type { DraftReleaseResult } from '../lib/pipeline.ts';
import type {
  GitAdapter,
  GithubAdapter,
  Integration,
  MilestoneItem,
  PullPayload,
} from '../lib/types.ts';

const CLOCK = (): string => '2026-09-06T17:57:00Z';

const FEAT_SHA = 'f'.repeat(40);
const FIX_SHA = '1'.repeat(40);
const BACK_MERGE_SHA = SHA.BACK_MERGE;

type Overrides = {
  gh?: Partial<GithubAdapter>;
  git?: Partial<GitAdapter>;
};

/**
 * A range that mirrors the live situation: a `feat` landed since `v5.52.3`, the only open milestone
 * still says `5.52.4`, and a release back-merge sits in the range.
 */
function scenario(overrides: Overrides = {}): {
  calls: string[];
  git: GitAdapter;
  gh: GithubAdapter;
  request: RegistryRequest;
} {
  const integrations: Integration[] = [
    {
      sha: BACK_MERGE_SHA,
      parents: ['0'.repeat(40), '9'.repeat(40)],
      author: 'Strapi Bot',
      email: 'strapi-bot@users.noreply.github.com',
      authoredAt: '2026-09-01T10:00:00Z',
      subject: 'chore: release v5.52.3 update develop',
      body: '',
    },
    {
      sha: FIX_SHA,
      parents: [BACK_MERGE_SHA],
      author: 'Dev A',
      email: '11+dev-a@users.noreply.github.com',
      authoredAt: '2026-09-02T10:00:00Z',
      subject: 'fix(upload): reserve list space for the bulk actions bar (#27509)',
      body: '',
    },
    {
      sha: FEAT_SHA,
      parents: [FIX_SHA],
      author: 'Dev B',
      email: 'dev-b@strapi.io',
      authoredAt: '2026-09-03T10:00:00Z',
      subject: 'feat(content-releases): record release actions in audit logs (#27436)',
      body: '',
    },
  ];

  const pullsByCommit: Record<string, PullPayload[]> = {
    [BACK_MERGE_SHA]: [
      {
        number: 27527,
        title: 'chore: release v5.52.3 update develop',
        html_url: 'https://github.com/strapi/strapi/pull/27527',
        merged_at: '2026-09-01T09:00:00Z',
        merge_commit_sha: BACK_MERGE_SHA,
        base: { ref: 'develop' },
        head: { ref: 'main', sha: '9'.repeat(40) },
        user: { login: 'strapi-bot' },
        milestone: null,
      },
    ],
    [FIX_SHA]: [
      {
        number: 27509,
        title: 'fix(upload): reserve list space for the bulk actions bar',
        html_url: 'https://github.com/strapi/strapi/pull/27509',
        merged_at: '2026-09-02T09:00:00Z',
        merge_commit_sha: FIX_SHA,
        base: { ref: 'develop' },
        head: { ref: 'fix/upload-bulk-bar', sha: 'a'.repeat(40) },
        user: { login: 'dev-a' },
        milestone: { title: '5.52.4' },
      },
    ],
    [FEAT_SHA]: [
      {
        number: 27436,
        title: 'feat(content-releases): record release actions in audit logs',
        html_url: 'https://github.com/strapi/strapi/pull/27436',
        merged_at: '2026-09-03T09:00:00Z',
        merge_commit_sha: FEAT_SHA,
        base: { ref: 'develop' },
        head: { ref: 'feat/audit-logs', sha: 'b'.repeat(40) },
        user: { login: 'dev-b' },
        milestone: { title: '5.52.4' },
      },
    ],
  };

  const milestoneItems: MilestoneItem[] = [
    { number: 27436, title: 'audit logs', state: 'closed', pull_request: { merged_at: 'x' } },
    { number: 27509, title: 'bulk bar', state: 'closed', pull_request: { merged_at: 'x' } },
    { number: 27600, title: 'still open', state: 'open', pull_request: { merged_at: null } },
    { number: 27601, title: 'abandoned', state: 'closed', pull_request: { merged_at: null } },
    { number: 26000, title: 'an issue', state: 'open' },
  ];

  const calls: string[] = [];

  const gh: GithubAdapter = {
    coords: { owner: 'strapi', repo: 'strapi' },
    getRepository: async () => ({
      allow_merge_commit: true,
      allow_squash_merge: true,
      allow_rebase_merge: false,
    }),
    listPullsForCommit: async (sha) => pullsByCommit[sha] ?? [],
    async getPull() {
      throw new Error('404');
    },
    listPullCommits: async () => [],
    listMilestones: async () => [{ number: 430, title: '5.52.4', state: 'open' }],
    async createMilestone(title) {
      calls.push(`createMilestone:${title}`);

      return { number: 431, title };
    },
    async updateMilestone(number, patch) {
      calls.push(`updateMilestone:${number}:${JSON.stringify(patch)}`);

      return { number, title: patch.title ?? '' };
    },
    listMilestoneItems: async () => milestoneItems,
    async setIssueMilestone(issueNumber, milestoneNumber) {
      calls.push(`setIssueMilestone:${issueNumber}:${milestoneNumber}`);
    },
    async createPull(input) {
      calls.push(`createPull:${input.title}`);

      return { number: 27700, html_url: 'https://github.com/strapi/strapi/pull/27700' };
    },
    async updatePullBody(number) {
      calls.push(`updatePullBody:${number}`);
    },
    async addLabels(number, labels) {
      calls.push(`addLabels:${number}:${labels.join(',')}`);
    },
    async createComment(number) {
      calls.push(`createComment:${number}`);
    },
    ...overrides.gh,
  };

  const git: GitAdapter = {
    refExists: () => true,
    resolveSha: (ref) => (ref === 'v5.52.3' ? '0'.repeat(40) : FEAT_SHA),
    isAncestor: () => true,
    listIntegrations: () => integrations,
    remoteBranchExists: () => false,
    pushBranch(sha, branch) {
      calls.push(`pushBranch:${branch}:${sha}`);
    },
    ...overrides.git,
  };

  const request: RegistryRequest = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      'dist-tags': { latest: '5.52.3' },
      versions: { '5.52.1': {}, '5.52.2': {}, '5.52.3': {} },
    }),
  });

  return { calls, git, gh, request };
}

async function run(
  inputs: { dryRun: boolean; version?: string },
  overrides: Overrides = {}
): Promise<{ calls: string[]; result: DraftReleaseResult }> {
  const context = scenario(overrides);
  const journal = createJournal({ apply: inputs.dryRun === false, clock: CLOCK });

  const result = await runDraftRelease({
    inputs: { version: '', sourceRef: 'develop', ...inputs },
    git: context.git,
    gh: context.gh,
    journal,
    request: context.request,
    logger: { info() {} },
    clock: CLOCK,
  });

  return { calls: context.calls, result };
}

describe('runDraftRelease', () => {
  it('computes a minor from the feat that landed, ignoring the release back-merge', async () => {
    const { result } = await run({ dryRun: true });

    assert.equal(result.version, '5.53.0');
    assert.equal(result.bump, 'minor');
    assert.equal(result.payload.release.source, 'computed');
    assert.deepEqual(result.payload.bumpEvidence.ignored, [
      {
        sha: BACK_MERGE_SHA,
        reason: 'back-merge',
        subject: 'chore: release v5.52.3 update develop',
      },
    ]);
  });

  it('performs no write on a dry run and still reports every planned one', async () => {
    const { calls, result } = await run({ dryRun: true });

    assert.deepEqual(calls, []);
    assert.equal(result.journal.mode, 'planned');
    assert.deepEqual(
      result.journal.entries.map((entry) => entry.op),
      [
        'milestone.rename',
        'milestone.create',
        'milestone.close',
        'branch.push',
        'pr.create',
        'pr.label',
        'pr.body',
        'issue.milestone.set',
        'issue.milestone.clear',
        'issue.milestone.clear',
        'pr.comment',
      ]
    );
  });

  it('renames, opens the next milestone, then closes the shipping one', async () => {
    const { calls } = await run({ dryRun: false });

    assert.deepEqual(calls.slice(0, 3), [
      'updateMilestone:430:{"title":"5.53.0"}',
      'createMilestone:5.53.1',
      'updateMilestone:430:{"state":"closed"}',
    ]);
  });

  it('cuts the branch at the pinned SHA and labels the PR for the experimental publish', async () => {
    const { calls } = await run({ dryRun: false });

    assert.equal(calls.includes(`pushBranch:releases/5.53.0:${FEAT_SHA}`), true);
    assert.equal(calls.includes('createPull:Release 5.53.0'), true);
    assert.equal(calls.includes(`addLabels:27700:${EXPERIMENTAL_LABEL}`), true);
    assert.equal(calls.includes('updatePullBody:27700'), true);
    assert.equal(calls.includes('createComment:27700'), true);
  });

  it('moves open pull requests forward, clears closed ones and every issue', async () => {
    const { calls } = await run({ dryRun: false });

    assert.equal(calls.includes('setIssueMilestone:27600:431'), true);
    assert.equal(calls.includes('setIssueMilestone:27601:null'), true);
    assert.equal(calls.includes('setIssueMilestone:26000:null'), true);
    assert.equal(
      calls.some((call) => call.startsWith('setIssueMilestone:27436')),
      false
    );
  });

  it('keeps the release back-merge out of the shipping set and out of the drift report', async () => {
    const { result } = await run({ dryRun: true });

    assert.deepEqual(
      result.payload.pullRequests.map((pull) => pull.number),
      [27509, 27436]
    );
    assert.deepEqual(result.payload.reconciliation, {
      inHistoryNotInMilestone: [],
      inMilestoneNotInHistory: [],
    });
  });

  it('names every shipping author by display name and login', async () => {
    const { result } = await run({ dryRun: false });

    assert.deepEqual(
      result.payload.pullRequests.map((pull) => pull.author),
      [
        { login: 'dev-a', name: 'Dev A' },
        { login: 'dev-b', name: 'Dev B' },
      ]
    );
  });

  it('identifies the candidate it just created', async () => {
    const { result } = await run({ dryRun: false });

    assert.deepEqual(result.payload.candidate, {
      branch: 'releases/5.53.0',
      headSha: FEAT_SHA,
      expectedExperimentalVersion: `0.0.0-experimental.${FEAT_SHA}`,
      pullRequestNumber: 27700,
      pullRequestUrl: 'https://github.com/strapi/strapi/pull/27700',
    });

    assert.equal(result.payload.candidate.headSha, result.payload.range.toSha);
    assert.equal(result.payload.candidate.branch, result.branch);
    assert.equal(result.payload.schemaVersion, 4);
  });

  it('reports no pull request for a candidate a dry run only planned', async () => {
    const { result } = await run({ dryRun: true });

    assert.deepEqual(result.payload.candidate, {
      branch: 'releases/5.53.0',
      headSha: FEAT_SHA,
      expectedExperimentalVersion: `0.0.0-experimental.${FEAT_SHA}`,
      pullRequestNumber: null,
      pullRequestUrl: null,
    });
  });

  it('embeds a machine-readable payload in the pull request body', async () => {
    const { result } = await run({ dryRun: true });
    const body = renderBody({
      payload: result.payload,
      pullRequests: result.payload.pullRequests,
      attention: result.payload.attention,
    });

    assert.match(body, /"version": "5\.53\.0"/u);
    assert.match(body, /"renamedFrom": "5\.52\.4"/u);
    assert.match(body, /"title": "5\.53\.1"/u);
  });

  it('bypasses the commit rule when a version is given', async () => {
    const { result } = await run({ dryRun: true, version: '5.52.4' });

    assert.equal(result.version, '5.52.4');
    assert.equal(result.bump, 'patch');
    assert.equal(result.payload.release.source, 'version-input');
    assert.equal(result.payload.milestones.next.title, '5.52.5');
  });

  it('rejects a version input that does not move forward', async () => {
    await assert.rejects(
      () => run({ dryRun: true, version: '5.52.3' }),
      /not greater than the published baseline/u
    );
  });

  it('rejects a malformed version input', async () => {
    await assert.rejects(() => run({ dryRun: true, version: '5.53' }), /not a stable x\.y\.z/u);
  });

  it('stops the whole run when only the landing commit body says the range breaks', async () => {
    // End to end, not just the classifier: an unparsed squash subject with a breaking footer in
    // the body has to fail the run before any branch is cut or milestone touched.
    await assert.rejects(
      () =>
        run(
          { dryRun: true },
          {
            git: {
              listIntegrations: () => [
                {
                  sha: FEAT_SHA,
                  parents: [FIX_SHA],
                  author: 'Dev B',
                  email: 'dev-b@strapi.io',
                  authoredAt: '2026-09-03T10:00:00Z',
                  subject: 'Feat/record release actions (#27436)',
                  body: 'Adds audit logs.\n\nBREAKING CHANGE: the audit log payload shape moved.',
                },
              ],
            },
          }
        ),
      /carries a breaking change/u
    );
  });

  it('stops instead of reporting a failed lookup as a direct commit', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: true },
          {
            gh: {
              async listPullsForCommit() {
                throw new Error('502 Bad Gateway');
              },
            },
          }
        ),
      /lookups failed/u
    );
  });

  it('stops when the release branch already exists', async () => {
    await assert.rejects(
      () => run({ dryRun: true }, { git: { remoteBranchExists: () => true } }),
      /already exists/u
    );
  });

  it('stops when the range is empty', async () => {
    await assert.rejects(
      () => run({ dryRun: true }, { git: { listIntegrations: () => [] } }),
      /Nothing to release/u
    );
  });

  it('stops when rebase merges are enabled', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: true },
          {
            gh: {
              getRepository: async () => ({
                allow_merge_commit: true,
                allow_squash_merge: true,
                allow_rebase_merge: true,
              }),
            },
          }
        ),
      /Rebase merges are enabled/u
    );
  });

  it('stops when more than one milestone is open', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: true },
          {
            gh: {
              listMilestones: async () => [
                { number: 430, title: '5.52.4', state: 'open' },
                { number: 431, title: '5.53.0', state: 'open' },
              ],
            },
          }
        ),
      /Expected at most one open milestone/u
    );
  });

  it('reports a second-parent mismatch as a warning rather than failing', async () => {
    const { result } = await run(
      { dryRun: true },
      {
        gh: {
          listPullsForCommit: async (sha) =>
            sha === BACK_MERGE_SHA
              ? [
                  {
                    number: 27527,
                    title: 'chore: release v5.52.3 update develop',
                    merged_at: 'x',
                    merge_commit_sha: BACK_MERGE_SHA,
                    base: { ref: 'develop' },
                    head: { ref: 'main', sha: 'moved' },
                    user: { login: 'strapi-bot' },
                  },
                ]
              : [],
        },
      }
    );

    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0] ?? '', /second-parent-mismatch/u);
  });

  it('lists a direct commit for a human instead of silently dropping it', async () => {
    const { result } = await run({ dryRun: true }, { gh: { listPullsForCommit: async () => [] } });

    assert.equal(
      result.payload.attention.every((record) => record.status === 'direct-integration'),
      true
    );
    assert.equal(result.payload.attention.length, 3);
  });
});
