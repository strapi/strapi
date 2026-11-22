import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLOSED_MARKER,
  REMINDER_MARKER,
  buildCloseComment,
  buildReminderComment,
  closeDate,
  diagnose,
  displayName,
  hasMarker,
  parseClaBotComment,
  parseOnlyPRs,
  pendingSince,
  planAction,
  processUnsignedClaPRs,
  type CommitInfo,
  type ProcessOptions,
} from './community-pr-cla.ts';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 19);
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/;

const commit = (
  sha: string,
  login: string | null,
  email: string,
  name = 'Someone'
): CommitInfo => ({
  sha: sha.padEnd(40, '0'),
  login,
  name,
  email,
  isMerge: false,
});

// Shapes copied from real PRs (emails replaced).
const MULTI_COMMITTER_BODY =
  '[![CLA assistant check](https://cla.strapi.io/pull/badge/not_signed)](x) <br/>Thank you! <br/>' +
  '**1** out of **2** committers have signed the CLA.<br/><br/>:white_check_mark: colinhacks<br/>:x: Colin McDonnell<br/><hr/>' +
  '**Colin McDonnell** seems not to be a GitHub user.';
const SINGLE_COMMITTER_BODY =
  '[![CLA assistant check](https://cla.strapi.io/pull/badge/not_signed)](x) <br/>Thank you!<br/><hr/>' +
  '**Dextheking1** seems not to be a GitHub user.';

const reminder = (d: ReturnType<typeof diagnose>) =>
  buildReminderComment({
    login: 'author',
    diagnosis: d,
    claUrl: 'https://cla.example/sign',
    recheckUrl: 'https://cla.example/check',
    days: 10,
    closeOn: new Date(NOW + 7 * DAY),
    repo: { owner: 'strapi', repo: 'strapi', baseRef: 'develop' },
  });

describe('parseClaBotComment', () => {
  it('reads the signed / unsigned committer list', () => {
    const parsed = parseClaBotComment(MULTI_COMMITTER_BODY, 'x');
    assert.deepEqual(parsed.signed, ['colinhacks']);
    assert.deepEqual(parsed.unsigned, ['Colin McDonnell']);
  });

  it('returns empty lists for a single committer', () => {
    const parsed = parseClaBotComment(SINGLE_COMMITTER_BODY, 'x');
    assert.deepEqual(parsed.signed, []);
    assert.deepEqual(parsed.unsigned, []);
  });
});

describe('diagnose', () => {
  it('plain unsigned author', () => {
    const d = diagnose('author', [commit('a1', 'author', 'me@example.com')], null);
    assert.equal(d.authorUnsigned, true);
    assert.deepEqual(d.unlinked, []);
    assert.deepEqual(d.otherUnsigned, []);
  });

  it('commits from a GitHub identity that does not exist (#27797)', () => {
    const d = diagnose(
      'benjaminkincses',
      [
        commit('b578316', null, 'Dextheking1@users.noreply.github.com', 'Dextheking1'),
        commit('e749fe7', null, 'Dextheking1@users.noreply.github.com', 'Dextheking1'),
      ],
      parseClaBotComment(SINGLE_COMMITTER_BODY, 'x')
    );
    assert.equal(d.authorUnsigned, false);
    assert.equal(d.unlinked.length, 2);
    assert.ok(d.unlinked.every((c) => c.fakeNoreply));
  });

  it('email not added to the account (#28480)', () => {
    const d = diagnose(
      'Msush3005',
      [commit('0d7be0d', null, 'someone@gmail.com', 'Msush3005')],
      null
    );
    assert.equal(d.unlinked.length, 1);
    assert.equal(d.unlinked[0].fakeNoreply, false);
  });

  it('two authors, one signed, the other unlinked (#26864)', () => {
    const d = diagnose(
      'colinhacks',
      [
        commit('94d36d3', 'colinhacks', '1+colinhacks@users.noreply.github.com'),
        commit('47477d1', null, 'colin@work.example', 'Colin McDonnell'),
      ],
      parseClaBotComment(MULTI_COMMITTER_BODY, 'x')
    );
    assert.equal(d.authorUnsigned, false);
    assert.deepEqual(
      d.unlinked.map((c) => c.sha.slice(0, 7)),
      ['47477d1']
    );
    assert.deepEqual(d.otherUnsigned, []);
  });

  it('second GitHub account that has not signed (#27513)', () => {
    const d = diagnose(
      'dev-bikaneria0201',
      [
        commit('c66b8ed', 'dev-bikaneria01', 'x@example.com'),
        commit('14ec7f4', 'dev-bikaneria0201', 'y@example.com'),
      ],
      parseClaBotComment(':white_check_mark: dev-bikaneria0201<br/>:x: dev-bikaneria01<br/>', 'x')
    );
    assert.equal(d.authorUnsigned, false);
    assert.deepEqual(
      d.otherUnsigned.map((o) => o.login),
      ['dev-bikaneria01']
    );
  });

  it('ignores merge commits', () => {
    const d = diagnose(
      'author',
      [
        commit('a1', 'author', 'a@example.com'),
        { ...commit('m1', null, 'noreply@github.com'), isMerge: true },
      ],
      null
    );
    assert.deepEqual(d.unlinked, []);
    assert.equal(d.authorUnsigned, true);
  });

  it('names no co-author when the CLA bot has no list', () => {
    // Anyone can author a commit with someone else's email: without the bot's ❌, don't ping them.
    for (const bot of [null, parseClaBotComment(SINGLE_COMMITTER_BODY, 'x')]) {
      const d = diagnose(
        'author',
        [commit('a1', 'author', 'a@example.com'), commit('a2', 'victim', 'v@example.com')],
        bot
      );
      assert.deepEqual(d.otherUnsigned, []);
      assert.equal(d.authorUnsigned, false);
      assert.doesNotMatch(reminder(d), /@victim/);
    }
  });

  it('only names co-authors the CLA bot marks unsigned', () => {
    const d = diagnose(
      'author',
      [
        commit('a1', 'author', 'a@example.com'),
        commit('a2', 'signedone', 's@example.com'),
        commit('a3', 'other', 'o@example.com'),
      ],
      parseClaBotComment(
        ':white_check_mark: author<br/>:white_check_mark: signedone<br/>:x: other<br/>',
        'x'
      )
    );
    assert.deepEqual(
      d.otherUnsigned.map((o) => o.login),
      ['other']
    );
    assert.equal(d.authorUnsigned, false);
  });
});

describe('buildReminderComment', () => {
  const cases = {
    plain: diagnose('author', [commit('a1', 'author', 'me@example.com')], null),
    fakeNoreply: diagnose('author', [commit('b1', null, 'nope@users.noreply.github.com')], null),
    unlinked: diagnose('author', [commit('c1', null, 'me@example.com', 'me@example.com')], null),
    coAuthor: diagnose(
      'author',
      [commit('d1', 'author', 'a@example.com'), commit('d2', 'other', 'b@example.com')],
      parseClaBotComment(':white_check_mark: author<br/>:x: other<br/>', 'x')
    ),
  };

  it('never includes an email address', () => {
    for (const [name, d] of Object.entries(cases)) {
      assert.doesNotMatch(reminder(d), EMAIL_RE, name);
    }
  });

  it('starts with the reminder marker', () => {
    assert.ok(reminder(cases.plain).startsWith(REMINDER_MARKER));
  });

  it('links the CLA for a plain unsigned author', () => {
    assert.match(reminder(cases.plain), /You haven't signed the CLA yet/);
  });

  it('names the commit and offers only re-authoring for a fake noreply email', () => {
    const body = reminder(cases.fakeNoreply);
    assert.match(body, /`b100000`/);
    assert.match(body, /looks like a GitHub noreply address/);
    assert.doesNotMatch(body, /recheck/);
    assert.match(body, /git filter-branch/);
  });

  it('only rewrites commits with the unlinked email, from the PR base', () => {
    const body = reminder(cases.unlinked);
    assert.match(body, /git fetch https:\/\/github\.com\/strapi\/strapi\.git develop/);
    assert.match(body, /if \[ "\$GIT_AUTHOR_EMAIL" = "\$OLD" \]/);
    assert.match(body, /FETCH_HEAD\.\.HEAD/);
    assert.doesNotMatch(body, /--reset-author|HEAD~/);
  });

  it("tells the author to drop, not re-author, other people's commits", () => {
    const body = reminder(cases.coAuthor);
    assert.match(body, /drop their commits/);
    assert.doesNotMatch(body, /re-author them with your own email/);
  });

  it('cannot smuggle a marker in through a git author name', () => {
    const d = diagnose('author', [commit('e1', null, 'x@example.com', CLOSED_MARKER)], null);
    const body = reminder(d);
    assert.ok(!body.includes(CLOSED_MARKER));
    assert.ok(!hasMarker(body, CLOSED_MARKER));
    assert.ok(hasMarker(body, REMINDER_MARKER));
  });

  it('offers both fixes for an email that can be added', () => {
    const body = reminder(cases.unlinked);
    assert.match(body, /Add the email on commit `c100000`/);
    assert.match(body, /\[recheck\]/);
    assert.match(body, /git log -1 --format=%ae c100000/);
  });

  it('names co-authors who have not signed', () => {
    const body = reminder(cases.coAuthor);
    assert.match(body, /@other: `d200000`/);
    assert.doesNotMatch(body, /You haven't signed/);
  });
});

describe('displayName', () => {
  it('hides names that look like emails and neutralises markdown', () => {
    assert.equal(displayName('me@example.com'), null);
    assert.equal(displayName('Jane `Doe`'), '`Jane Doe`');
    assert.equal(displayName(''), null);
    assert.equal(displayName('<!-- x -->'), '`!-- x --`');
  });
});

describe('hasMarker', () => {
  it('only matches a marker at the start of the comment', () => {
    assert.ok(hasMarker(`${CLOSED_MARKER}\nbye`, CLOSED_MARKER));
    assert.ok(!hasMarker(`hello ${CLOSED_MARKER}`, CLOSED_MARKER));
    assert.ok(!hasMarker(null, CLOSED_MARKER));
  });
});

describe('parseOnlyPRs', () => {
  it('is undefined when empty', () => {
    assert.equal(parseOnlyPRs(undefined), undefined);
    assert.equal(parseOnlyPRs('  '), undefined);
  });

  it('accepts spaces, commas and a leading #', () => {
    assert.deepEqual(parseOnlyPRs('#26424, 26864 27513'), [26424, 26864, 27513]);
  });

  it('throws instead of widening the run', () => {
    assert.throws(() => parseOnlyPRs('26424 abc'), /not a PR number/);
    assert.throws(() => parseOnlyPRs('PR-1'), /not a PR number/);
  });
});

describe('pendingSince', () => {
  const iso = (t: number) => new Date(t).toISOString();

  it('starts at the CLA bot comment while the check never passed', () => {
    const t = pendingSince({
      botCommentAt: iso(NOW - 60 * DAY),
      prCreatedAt: iso(NOW - 61 * DAY),
      statuses: [{ state: 'PENDING', createdAt: iso(NOW - 60 * DAY) }],
    });
    assert.equal(t, NOW - 60 * DAY);
  });

  it('restarts when the check goes pending after passing', () => {
    const t = pendingSince({
      botCommentAt: iso(NOW - 60 * DAY),
      prCreatedAt: iso(NOW - 61 * DAY),
      statuses: [
        { state: 'SUCCESS', createdAt: iso(NOW - 20 * DAY) },
        { state: 'PENDING', createdAt: iso(NOW - 3 * DAY) },
      ],
    });
    assert.equal(t, NOW - 3 * DAY);
  });
});

describe('buildCloseComment', () => {
  it('has the marker and a reopen hint', () => {
    const body = buildCloseComment({
      login: 'author',
      claUrl: 'https://cla.example',
      closeDays: 30,
    });
    assert.ok(body.startsWith(CLOSED_MARKER));
    assert.match(body, /reopen/);
  });
});

describe('planAction', () => {
  const base = { now: NOW, reminderDays: 7, closeDays: 30, reminderAt: null, closedAt: null };

  it('waits during the first week', () => {
    assert.equal(planAction({ ...base, unsignedSince: NOW - 6 * DAY }).type, 'too-early');
  });

  it('reminds after a week', () => {
    assert.equal(planAction({ ...base, unsignedSince: NOW - 7 * DAY }).type, 'remind');
  });

  it('never reminds twice', () => {
    const plan = planAction({ ...base, unsignedSince: NOW - 10 * DAY, reminderAt: NOW - 3 * DAY });
    assert.equal(plan.type, 'wait');
  });

  it('closes after a month once the reminder is a week old', () => {
    const plan = planAction({ ...base, unsignedSince: NOW - 31 * DAY, reminderAt: NOW - 8 * DAY });
    assert.equal(plan.type, 'close');
  });

  it('does not close right after a late reminder', () => {
    const plan = planAction({ ...base, unsignedSince: NOW - 200 * DAY, reminderAt: NOW - 2 * DAY });
    assert.equal(plan.type, 'wait');
  });

  it('leaves reopened PRs alone', () => {
    const plan = planAction({
      ...base,
      unsignedSince: NOW - 60 * DAY,
      reminderAt: NOW - 40 * DAY,
      closedAt: NOW - 10 * DAY,
    });
    assert.equal(plan.type, 'reopened');
  });
});

describe('closeDate', () => {
  it('is a month after the CLA was first requested', () => {
    const d = closeDate({
      unsignedSince: NOW - 10 * DAY,
      now: NOW,
      reminderDays: 7,
      closeDays: 30,
    });
    assert.equal(d.getTime(), NOW + 20 * DAY);
  });

  it('is at least a week after the reminder for old PRs', () => {
    const d = closeDate({
      unsignedSince: NOW - 300 * DAY,
      now: NOW,
      reminderDays: 7,
      closeDays: 30,
    });
    assert.equal(d.getTime(), NOW + 7 * DAY);
  });
});

// ─── processUnsignedClaPRs with a fake Octokit ──────────────────────────────

interface FakePR {
  number: number;
  login?: string;
  typename?: string;
  association?: string;
  labels?: string[];
  claState?: string | null;
  /** Latest `license/cla` status of each commit in the PR (GraphQL). */
  statuses?: Array<{ state: string; createdAt: string }>;
  /** Full status history of the head commit (REST, newest first). */
  headStatuses?: Array<{ context: string; state: string; created_at: string }>;
  /** Force-pushes, with the latest CLA status of the head they replaced. */
  forcePushes?: Array<{ createdAt: string; before?: { state: string; createdAt: string } }>;
  /** Close events, by actor login as GraphQL reports it. */
  closedEvents?: Array<{ createdAt: string; actor: string }>;
  comments?: Array<{ login: string; body: string; created_at: string }>;
  commits?: Array<{ sha: string; login: string | null; email: string }>;
}

const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const botComment = (daysAgo: number) => ({
  login: 'strapi-cla',
  body: SINGLE_COMMITTER_BODY,
  created_at: iso(daysAgo),
});
const ours = (marker: string, daysAgo: number) => ({
  login: 'github-actions[bot]',
  body: `${marker}\nbody`,
  created_at: iso(daysAgo),
});

function fakeGithub(prs: FakePR[], fail: { update?: number[]; comment?: number[] } = {}) {
  const calls: string[] = [];
  const byNumber = new Map(prs.map((p) => [p.number, p]));
  const github = {
    graphql: async (query: string, vars: { number?: number }) => {
      if (query.includes('pullRequests(')) {
        return {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: prs.map((p) => ({
                number: p.number,
                createdAt: iso(100),
                baseRefName: 'develop',
                authorAssociation: p.association ?? 'CONTRIBUTOR',
                author: { login: p.login ?? 'author', __typename: p.typename ?? 'User' },
                labels: { nodes: (p.labels ?? []).map((name) => ({ name })) },
                commits: {
                  nodes: [
                    {
                      commit: {
                        oid: `head${p.number}`.padEnd(40, '0'),
                        status:
                          p.claState === null
                            ? null
                            : { context: { state: p.claState ?? 'PENDING', targetUrl: null } },
                      },
                    },
                  ],
                },
              })),
            },
          },
        };
      }
      const p = byNumber.get(vars.number!)!;
      return {
        repository: {
          pullRequest: {
            commits: {
              nodes: (p.statuses ?? []).map((context) => ({ commit: { status: { context } } })),
            },
            timelineItems: {
              nodes: [
                ...(p.forcePushes ?? []).map((f) => ({
                  __typename: 'HeadRefForcePushedEvent',
                  createdAt: f.createdAt,
                  beforeCommit: { status: f.before ? { context: f.before } : null },
                })),
                ...(p.closedEvents ?? []).map((c) => ({
                  __typename: 'ClosedEvent',
                  createdAt: c.createdAt,
                  actor: { login: c.actor },
                })),
              ],
            },
          },
        },
      };
    },
    paginate: async (method: (params: unknown) => Promise<{ data: unknown[] }>, params: unknown) =>
      (await method(params)).data,
    rest: {
      repos: {
        listCommitStatusesForRef: async ({ ref }: { ref: string }) => {
          const p = prs.find((x) => `head${x.number}`.padEnd(40, '0') === ref)!;
          return { data: p.headStatuses ?? [] };
        },
      },
      issues: {
        listComments: async ({ issue_number }: { issue_number: number }) => ({
          data: (byNumber.get(issue_number)!.comments ?? []).map((c) => ({
            user: { login: c.login },
            body: c.body,
            created_at: c.created_at,
          })),
        }),
        createComment: async ({ issue_number, body }: { issue_number: number; body: string }) => {
          calls.push(`comment #${issue_number} ${body.split('\n')[0]}`);
          if (fail.comment?.includes(issue_number)) throw new Error('locked');
          return {};
        },
      },
      pulls: {
        listCommits: async ({ pull_number }: { pull_number: number }) => ({
          data: (
            byNumber.get(pull_number)!.commits ?? [
              { sha: 'a1'.padEnd(40, '0'), login: 'author', email: 'a@example.com' },
            ]
          ).map((c) => ({
            sha: c.sha,
            author: c.login ? { login: c.login } : null,
            commit: { author: { name: 'Someone', email: c.email } },
            parents: [{}],
          })),
        }),
        update: async ({ pull_number }: { pull_number: number }) => {
          calls.push(`close #${pull_number}`);
          if (fail.update?.includes(pull_number)) throw new Error('503');
          return {};
        },
      },
    },
  };
  return { github, calls };
}

async function run(
  github: unknown,
  extra: Partial<ProcessOptions> = {}
): Promise<Awaited<ReturnType<typeof processUnsignedClaPRs>>> {
  return processUnsignedClaPRs({
    github: github as never,
    owner: 'strapi',
    repo: 'strapi',
    dryRun: false,
    reminderDays: 7,
    closeDays: 30,
    exemptLabels: ['pr: security'],
    now: NOW,
    log: () => {},
    ...extra,
  });
}

const actions = (results: Awaited<ReturnType<typeof run>>) =>
  Object.fromEntries(results.map((r) => [r.pr, r.action]));

describe('processUnsignedClaPRs', () => {
  it('skips bots, org members, passed checks and exempt labels', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, login: 'dependabot[bot]', typename: 'Bot', comments: [botComment(20)] },
      { number: 2, association: 'MEMBER', comments: [botComment(20)] },
      { number: 3, claState: 'SUCCESS', comments: [botComment(20)] },
      { number: 4, labels: ['waiting on author'], comments: [botComment(20)] },
      { number: 5, labels: ['Stale'], comments: [botComment(20)] },
      { number: 6, labels: ['pr: security'], comments: [botComment(20)] },
      { number: 7, claState: null, comments: [botComment(20)] },
      { number: 8, comments: [botComment(20)] },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 8: 'remind' });
    assert.deepEqual(calls, [`comment #8 ${REMINDER_MARKER}`]);
  });

  it('writes nothing in a dry run', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(20)] },
      { number: 2, comments: [botComment(40), ours(REMINDER_MARKER, 10)] },
    ]);
    const results = await run(github, { dryRun: true });
    assert.deepEqual(actions(results), { 1: 'remind', 2: 'close' });
    assert.deepEqual(calls, []);
  });

  it("finds its own markers and ignores them in other people's comments", async () => {
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(20), ours(REMINDER_MARKER, 5)] },
      {
        number: 2,
        comments: [botComment(20), { ...ours(REMINDER_MARKER, 5), login: 'someone' }],
      },
      { number: 3, comments: [botComment(20), { ...ours('', 5), body: `x ${REMINDER_MARKER}` }] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'wait', 2: 'remind', 3: 'remind' });
  });

  it('leaves a PR that was reopened after the close notice', async () => {
    const { github, calls } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 40), ours(CLOSED_MARKER, 10)],
      },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'reopened' });
    assert.deepEqual(calls, []);
  });

  it('closes the PR before posting the close notice', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(40), ours(REMINDER_MARKER, 10)] },
    ]);
    const closed: number[] = [];
    await run(github, { onClosed: async (n) => void closed.push(n) });
    assert.deepEqual(calls, ['close #1', `comment #1 ${CLOSED_MARKER}`]);
    assert.deepEqual(closed, [1]);
  });

  it('posts no close notice when closing fails, so the next run still closes', async () => {
    const pr = { number: 1, comments: [botComment(40), ours(REMINDER_MARKER, 10)] };
    const first = fakeGithub([pr], { update: [1] });
    const results = await run(first.github);
    assert.equal(results[0].action, 'error');
    assert.deepEqual(first.calls, ['close #1']);

    const second = fakeGithub([pr]);
    assert.deepEqual(actions(await run(second.github)), { 1: 'close' });
  });

  it('sends a new reminder when the check went pending again after passing', async () => {
    const { github, calls } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 40)],
        statuses: [
          { state: 'SUCCESS', createdAt: iso(20) },
          { state: 'PENDING', createdAt: iso(8) },
        ],
      },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'remind' });
    assert.equal(results[0].days, 8);
    assert.deepEqual(calls, [`comment #1 ${REMINDER_MARKER}`]);
  });

  it('sends a new reminder after a force-push, even with no SUCCESS in sight', async () => {
    // Reminder on day 7, force-push on day 40 (a rebase dropped the commit the check passed on,
    // or brought in a new unlinked one), now day 60.
    const { github, calls } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 53)],
        statuses: [{ state: 'PENDING', createdAt: iso(20) }],
        forcePushes: [{ createdAt: iso(20) }],
      },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'remind' });
    assert.deepEqual(calls, [`comment #1 ${REMINDER_MARKER}`]);
  });

  it('restarts the clock when the passing commit was force-pushed away', async () => {
    const { github } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 53)],
        statuses: [{ state: 'PENDING', createdAt: iso(20) }],
        forcePushes: [{ createdAt: iso(20), before: { state: 'SUCCESS', createdAt: iso(50) } }],
      },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'remind' });
    assert.equal(results[0].days, 20);
  });

  it('restarts the clock when the head commit went from SUCCESS back to pending', async () => {
    const { github, calls } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 53)],
        statuses: [{ state: 'PENDING', createdAt: iso(9) }],
        headStatuses: [
          { context: 'license/cla', state: 'pending', created_at: iso(9) },
          { context: 'other/check', state: 'success', created_at: iso(15) },
          { context: 'license/cla', state: 'success', created_at: iso(30) },
          { context: 'license/cla', state: 'pending', created_at: iso(60) },
        ],
      },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'remind' });
    assert.equal(results[0].days, 9);
    assert.deepEqual(calls, [`comment #1 ${REMINDER_MARKER}`]);
  });

  it('still counts a reminder sent after the last force-push', async () => {
    const { github, calls } = fakeGithub([
      {
        number: 1,
        comments: [botComment(60), ours(REMINDER_MARKER, 3)],
        forcePushes: [{ createdAt: iso(20) }],
      },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'wait' });
    assert.deepEqual(calls, []);
  });

  it('leaves a reopened PR alone when the close notice failed to post', async () => {
    const pr = { number: 1, comments: [botComment(40), ours(REMINDER_MARKER, 10)] };
    const first = fakeGithub([pr], { comment: [1] });
    const results = await run(first.github);
    assert.equal(results[0].action, 'error');
    assert.match(results[0].error ?? '', /^closed, but close comment: locked/);
    assert.deepEqual(first.calls, ['close #1', `comment #1 ${CLOSED_MARKER}`]);

    // A maintainer reopens it: the timeline has our close event, but no close notice exists.
    const reopened = fakeGithub([
      { ...pr, closedEvents: [{ createdAt: iso(0), actor: 'github-actions' }] },
    ]);
    assert.deepEqual(actions(await run(reopened.github)), { 1: 'reopened' });
    assert.deepEqual(reopened.calls, []);

    // Someone else closing and reopening the PR doesn't stop the follow-up.
    const byOther = fakeGithub([
      { ...pr, closedEvents: [{ createdAt: iso(1), actor: 'a-maintainer' }] },
    ]);
    assert.deepEqual(actions(await run(byOther.github)), { 1: 'close' });
  });

  it('keeps going after a PR fails, and reports it', async () => {
    const { github, calls } = fakeGithub(
      [
        { number: 1, comments: [botComment(20)] },
        { number: 2, comments: [botComment(20)] },
      ],
      { comment: [1] }
    );
    const results = await run(github);
    assert.equal(results[0].action, 'error');
    assert.equal(results[0].error, 'locked');
    assert.equal(results[1].action, 'remind');
    assert.equal(calls.length, 2);
  });

  it('does not let a failing onClosed stop the run', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(40), ours(REMINDER_MARKER, 10)] },
      { number: 2, comments: [botComment(40), ours(REMINDER_MARKER, 10)] },
    ]);
    const results = await run(github, {
      onClosed: async () => {
        throw new Error('linear down');
      },
    });
    assert.deepEqual(
      calls.filter((c) => c.startsWith('close')),
      ['close #1', 'close #2']
    );
    assert.match(results[0].error ?? '', /linear down/);
  });

  it('processes nothing when `only` is an empty list', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(20)] },
      { number: 2, comments: [botComment(20)] },
    ]);
    assert.deepEqual(await run(github, { only: [] }), []);
    assert.deepEqual(calls, []);
  });

  it('restricts the run to `only`', async () => {
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(20)] },
      { number: 2, comments: [botComment(20)] },
    ]);
    assert.deepEqual(actions(await run(github, { only: [2] })), { 2: 'remind' });
  });
});
