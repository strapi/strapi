import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createJournal } from '../lib/journal.ts';
import { EXPERIMENTAL_LABEL, preflightRelease, runDraftRelease } from '../lib/pipeline.ts';
import { renderBody } from '../lib/report.ts';
import { SHA, candidateHead, candidatePull } from '../lib/__fixtures__/fixtures.ts';

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
  /** The pull requests open against `main`, which is where a candidate in flight is found. */
  openPulls?: PullPayload[];
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
    listPulls: async () => overrides.openPulls ?? [],
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
    async closePull(number) {
      calls.push(`closePull:${number}`);
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
    deleteBranch(branch, expectedSha) {
      calls.push(`deleteBranch:${branch}:${expectedSha}`);
    },
    fetchBranch(branch) {
      calls.push(`fetchBranch:${branch}`);
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
    inputs: { version: '', ...inputs },
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
        'branch.push',
        'pr.create',
        'pr.label',
        'milestone.rename',
        'milestone.create',
        'issue.milestone.set',
        'issue.milestone.set',
        'issue.milestone.set',
        'issue.milestone.clear',
        'issue.milestone.clear',
        'milestone.close',
        'pr.body',
        'pr.comment',
      ]
    );
  });

  it('pushes the branch and opens the pull request before touching a milestone', async () => {
    // The two writes most likely to fail on permissions go first, so a failure there leaves at
    // most one write behind instead of dozens of milestone moves.
    const { calls } = await run({ dryRun: false });

    const firstMilestoneWrite = calls.findIndex(
      (call) => call.startsWith('updateMilestone:') === true || call.startsWith('createMilestone:')
    );

    assert.equal(calls.indexOf(`pushBranch:releases/5.53.0:${FEAT_SHA}`), 0);
    assert.equal(calls.indexOf('createPull:Release 5.53.0'), 1);
    assert.equal(calls.indexOf(`addLabels:27700:${EXPERIMENTAL_LABEL}`), 2);
    assert.equal(firstMilestoneWrite, 3);
  });

  it('renames, opens the next milestone, then closes the shipping one', async () => {
    const { calls } = await run({ dryRun: false });

    assert.deepEqual(
      calls.filter(
        (call) =>
          call.startsWith('updateMilestone:') === true || call.startsWith('createMilestone:')
      ),
      [
        'updateMilestone:430:{"title":"5.53.0"}',
        'createMilestone:5.53.1',
        'updateMilestone:430:{"state":"closed"}',
      ]
    );
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
    // 27436 and 27509 shipped, so they are pulled into the shipping milestone rather than left
    // on the one their authors picked.
    assert.equal(calls.includes('setIssueMilestone:27436:430'), true);
    assert.equal(calls.includes('setIssueMilestone:27509:430'), true);
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
      branchAdvanced: true,
      pullRequestNumber: 27700,
      pullRequestUrl: 'https://github.com/strapi/strapi/pull/27700',
    });

    assert.equal(result.payload.candidate.headSha, result.payload.range.toSha);
    assert.equal(result.payload.candidate.branch, result.branch);
    assert.equal(result.payload.release.mode, 'draft');
    assert.equal(result.payload.schemaVersion, 5);
  });

  it('reports no pull request for a candidate a dry run only planned', async () => {
    const { result } = await run({ dryRun: true });

    assert.deepEqual(result.payload.candidate, {
      branch: 'releases/5.53.0',
      headSha: FEAT_SHA,
      expectedExperimentalVersion: `0.0.0-experimental.${FEAT_SHA}`,
      branchAdvanced: true,
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

  it('drafts as if nothing were open when the only release pull request comes from a fork', async () => {
    const { calls, result } = await run(
      { dryRun: false },
      {
        openPulls: [
          candidatePull({
            head: { ...candidateHead('5.53.0'), repo: { full_name: 'someone/strapi' } },
          }),
        ],
      }
    );

    assert.equal(result.mode, 'draft');
    assert.equal(result.pullNumber, 27700);
    assert.equal(calls.includes('createPull:Release 5.53.0'), true);
    assert.equal(calls.includes('updatePullBody:27600'), false);
  });

  it('stops when a release branch was left behind with no pull request drafting it', async () => {
    await assert.rejects(
      () => run({ dryRun: true }, { git: { remoteBranchExists: () => true } }),
      /already exists but no open pull request is drafting it/u
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

/**
 * The second and third runs of a release window.
 *
 * `develop` keeps moving while a candidate is open, so the action has to fold what landed since
 * into the same release. These scenarios start from the repository state the first run leaves
 * behind: the shipping milestone closed, the next one open, and the release pull request in flight.
 */
describe('runDraftRelease, candidate in flight', () => {
  const CANDIDATE_MILESTONES = [
    { number: 430, title: '5.53.0', state: 'closed' },
    { number: 431, title: '5.53.1', state: 'open' },
  ];

  /** The release branch sits at `head`, which is behind `develop` unless it is `FEAT_SHA`. */
  function inFlight(head: string, overrides: Overrides = {}): Overrides {
    return {
      ...overrides,
      openPulls: overrides.openPulls ?? [candidatePull()],
      gh: { listMilestones: async () => CANDIDATE_MILESTONES, ...overrides.gh },
      git: {
        remoteBranchExists: () => true,
        resolveSha(ref) {
          if (ref === 'v5.52.3') {
            return '0'.repeat(40);
          }

          return ref.startsWith('origin/releases/') === true ? head : FEAT_SHA;
        },
        ...overrides.git,
      },
    };
  }

  it('advances the candidate instead of opening a second one', async () => {
    const { calls, result } = await run({ dryRun: false }, inFlight(SHA.CANDIDATE_HEAD));

    assert.equal(result.mode, 'refresh');
    assert.equal(result.version, '5.53.0');
    assert.equal(result.pullNumber, 27600);
    assert.equal(calls.includes(`pushBranch:releases/5.53.0:${FEAT_SHA}`), true);
    assert.equal(calls.includes('updatePullBody:27600'), true);
    assert.equal(calls.includes('createComment:27600'), true);
    assert.equal(
      calls.some((call) => call.startsWith('createPull:')),
      false
    );
  });

  it('checks the branch is only a pointer into develop before touching it', async () => {
    const { calls } = await run({ dryRun: false }, inFlight(SHA.CANDIDATE_HEAD));

    assert.equal(calls.includes('fetchBranch:releases/5.53.0'), true);
  });

  it('leaves the shipping milestone closed and fills it through the API', async () => {
    const { calls, result } = await run({ dryRun: false }, inFlight(SHA.CANDIDATE_HEAD));

    assert.equal(result.payload.milestones.shipping.number, 430);
    assert.equal(result.payload.milestones.next.number, 431);
    assert.equal(calls.includes('setIssueMilestone:27509:430'), true);
    assert.equal(calls.includes('setIssueMilestone:27436:430'), true);
    assert.equal(
      calls.some((call) => call.includes('"state":"closed"')),
      false
    );
    assert.equal(
      calls.some((call) => call.startsWith('createMilestone:')),
      false
    );
  });

  it('does not push, and says so, when nothing landed since the last run', async () => {
    const { calls, result } = await run({ dryRun: false }, inFlight(FEAT_SHA));

    assert.equal(result.mode, 'refresh');
    assert.equal(result.payload.candidate.branchAdvanced, false);
    assert.equal(
      calls.some((call) => call.startsWith('pushBranch:')),
      false
    );
    assert.equal(calls.includes('updatePullBody:27600'), true);
  });

  // Only the containment check fails. The range pin asks the same question of the baseline tag,
  // and answering `false` there would stop the run for the wrong reason.
  const diverged: Partial<GitAdapter> = {
    isAncestor: (ancestor) => ancestor !== SHA.CANDIDATE_HEAD,
  };

  it('stops when something was pushed to the release branch directly', async () => {
    await assert.rejects(
      () => run({ dryRun: false }, inFlight(SHA.CANDIDATE_HEAD, { git: diverged })),
      /releases\/5\.53\.0 \(face0000.*\) is not contained in origin\/develop/u
    );
  });

  it('refuses in the preflight, before a single write is attempted', async () => {
    const context = scenario(inFlight(SHA.CANDIDATE_HEAD, { git: diverged }));

    await assert.rejects(() =>
      preflightRelease({
        inputs: { version: '', dryRun: false },
        git: context.git,
        gh: context.gh,
        journal: createJournal({ apply: true, clock: CLOCK }),
        request: context.request,
        logger: { info() {} },
        clock: CLOCK,
      })
    );

    // `fetchBranch` is the only call the preflight makes that the stub records, and it is a read.
    assert.deepEqual(context.calls, ['fetchBranch:releases/5.53.0']);
  });

  it('stops when the candidate pull request outlived its branch', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: false },
          inFlight(SHA.CANDIDATE_HEAD, { git: { remoteBranchExists: () => false } })
        ),
      /#27600 is open against releases\/5\.53\.0, but that branch is gone from the remote/u
    );
  });

  it('stops when the candidate release already published', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: false },
          inFlight(SHA.CANDIDATE_HEAD, {
            openPulls: [candidatePull({ head: candidateHead('5.52.3') })],
          })
        ),
      /is not above the published baseline 5\.52\.3, so that release already shipped/u
    );
  });

  it('stops when the version would move backwards', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: false },
          inFlight(SHA.CANDIDATE_HEAD, {
            openPulls: [candidatePull({ head: candidateHead('5.54.0') })],
          })
        ),
      /below the candidate 5\.54\.0/u
    );
  });

  it('stops when two release pull requests are open', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: false },
          inFlight(SHA.CANDIDATE_HEAD, {
            openPulls: [
              candidatePull(),
              candidatePull({ number: 27601, head: candidateHead('5.52.4') }),
            ],
          })
        ),
      /Found 2 open release pull requests/u
    );
  });

  it('stops when the open milestone is not the candidate’s next one', async () => {
    await assert.rejects(
      () =>
        run(
          { dryRun: false },
          inFlight(SHA.CANDIDATE_HEAD, {
            gh: {
              listMilestones: async () => [
                { number: 430, title: '5.53.0', state: 'closed' },
                { number: 432, title: '6.0.0', state: 'open' },
              ],
            },
          })
        ),
      /The open milestone is 6\.0\.0, but this release expects 5\.53\.1/u
    );
  });
});

describe('runDraftRelease, redraft', () => {
  /** The version drifted: the candidate was cut as 5.52.4, and a feat has landed since. */
  function drifted(overrides: Overrides = {}): Overrides {
    return {
      openPulls: [candidatePull({ number: 27600, head: candidateHead('5.52.4') })],
      gh: {
        listMilestones: async () => [
          { number: 430, title: '5.52.4', state: 'closed' },
          { number: 431, title: '5.52.5', state: 'open' },
        ],
        ...overrides.gh,
      },
      git: {
        remoteBranchExists: (branch) => branch === 'releases/5.52.4',
        resolveSha(ref) {
          if (ref === 'v5.52.3') {
            return '0'.repeat(40);
          }

          return ref.startsWith('origin/releases/') === true ? SHA.CANDIDATE_HEAD : FEAT_SHA;
        },
        ...overrides.git,
      },
    };
  }

  it('renames both milestones onto the version the commits decided', async () => {
    const { calls, result } = await run({ dryRun: false }, drifted());

    assert.equal(result.mode, 'redraft');
    assert.equal(result.version, '5.53.0');
    assert.deepEqual(
      calls.filter((call) => call.startsWith('updateMilestone:')),
      ['updateMilestone:430:{"title":"5.53.0"}', 'updateMilestone:431:{"title":"5.53.1"}']
    );
  });

  it('opens the replacement before retiring what it replaces', async () => {
    const { calls } = await run({ dryRun: false }, drifted());

    const created = calls.indexOf('createPull:Release 5.53.0');
    const closed = calls.indexOf('closePull:27600');
    const deleted = calls.indexOf(`deleteBranch:releases/5.52.4:${SHA.CANDIDATE_HEAD}`);

    assert.equal(created > -1, true);
    assert.equal(created < closed, true);
    assert.equal(closed < deleted, true);
  });

  it('deletes the old branch under a lease on the head the preflight saw', async () => {
    const { result } = await run({ dryRun: true }, drifted());
    const entry = result.journal.entries.find((candidate) => candidate.op === 'branch.delete');

    assert.equal(entry?.target, 'refs/heads/releases/5.52.4');
    assert.equal(entry?.before, SHA.CANDIDATE_HEAD);
  });

  it('records the whole sequence in the journal, in order', async () => {
    const { result } = await run({ dryRun: true }, drifted());

    assert.deepEqual(
      result.journal.entries.map((entry) => entry.op),
      [
        'branch.push',
        'pr.create',
        'pr.label',
        'milestone.rename',
        'milestone.rename',
        'issue.milestone.set',
        'issue.milestone.set',
        'issue.milestone.set',
        'issue.milestone.clear',
        'issue.milestone.clear',
        'pr.body',
        'pr.comment',
        'pr.close',
        'branch.delete',
        'pr.comment',
      ]
    );
  });

  it('tells the reader on both pull requests which one replaced which', async () => {
    const { result } = await run({ dryRun: false }, drifted());
    const body = renderBody({
      payload: result.payload,
      pullRequests: result.payload.pullRequests,
      attention: result.payload.attention,
      supersedes: { pullNumber: 27600, branch: 'releases/5.52.4' },
    });

    assert.match(body, /Supersedes #27600, which was drafted as `releases\/5\.52\.4`/u);
    assert.match(body, /Redrafted\./u);
  });
});
