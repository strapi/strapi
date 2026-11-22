import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUTHOR_BLOCKER,
  CLOSED_MARKER,
  MAX_REMINDERS,
  blockersOf,
  buildCloseComment,
  buildReminderComment,
  cancelLinearTicket,
  closeDate,
  diagnose,
  displayName,
  hasMarker,
  parseClaBotComment,
  parseOnlyPRs,
  parseReminderMarker,
  planAction,
  processUnsignedClaPRs,
  reminderMarker,
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
    assert.deepEqual(parseReminderMarker(reminder(cases.plain)), [AUTHOR_BLOCKER]);
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
    assert.deepEqual(parseReminderMarker(body), ['e1'.padEnd(40, '0')]);
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

describe('reminder marker', () => {
  const sha = 'c0ffee'.padEnd(40, '0');

  it('records the blockers it named and reads them back', () => {
    const marker = reminderMarker([AUTHOR_BLOCKER, sha]);
    assert.equal(marker, `<!-- community-pr-cla: reminder blockers=author,${sha} -->`);
    assert.deepEqual(parseReminderMarker(`${marker}\nbody`), [AUTHOR_BLOCKER, sha]);
    assert.deepEqual(parseReminderMarker(reminderMarker([])), []);
  });

  it('never records a name or an email', () => {
    const marker = reminderMarker(['me@example.com', 'Jane Doe', '-->', sha]);
    assert.equal(marker, `<!-- community-pr-cla: reminder blockers=${sha} -->`);
  });

  it('only matches at the start of the body', () => {
    assert.equal(parseReminderMarker(`hi ${reminderMarker([sha])}`), null);
    assert.equal(parseReminderMarker(null), null);
    assert.equal(parseReminderMarker(CLOSED_MARKER), null);
  });

  it('is what a reminder starts with, and lists only SHAs and `author`', () => {
    const d = diagnose(
      'author',
      [
        commit('a1', 'author', 'a@example.com'),
        commit('b1', null, 'me@example.com', 'me@example.com'),
        commit('d2', 'other', 'o@example.com'),
      ],
      parseClaBotComment(':x: author<br/>:x: other<br/>', 'x')
    );
    const body = reminder(d);
    const blockers = parseReminderMarker(body);
    assert.deepEqual(blockers, blockersOf(d));
    assert.deepEqual(blockers, [AUTHOR_BLOCKER, 'b1'.padEnd(40, '0'), 'd2'.padEnd(40, '0')]);
    assert.doesNotMatch(body.split('\n')[0], EMAIL_RE);
  });
});

describe('diagnose with the single-committer CLA comment', () => {
  it('does not tell a signed author they have not signed (#26424)', () => {
    // The author had signed; the head commit used a fake noreply address.
    const d = diagnose(
      'author',
      [
        commit('a1', 'author', 'a@example.com'),
        commit('464b1f1', null, 'someone@users.noreply.github.com', 'someone'),
      ],
      parseClaBotComment(SINGLE_COMMITTER_BODY, 'x')
    );
    assert.equal(d.authorUnsigned, false);
    const body = reminder(d);
    assert.doesNotMatch(body, /You haven't signed/);
    assert.match(body, /`464b1f1`/);
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
  const base = {
    now: NOW,
    reminderDays: 7,
    closeDays: 30,
    reminders: [],
    blockers: [AUTHOR_BLOCKER],
    closedNoticeAt: null,
  };
  const sent = (daysAgo: number, blockers = [AUTHOR_BLOCKER]) => ({
    at: NOW - daysAgo * DAY,
    blockers,
  });

  it('waits during the first week', () => {
    assert.equal(planAction({ ...base, unsignedSince: NOW - 6 * DAY }).type, 'too-early');
  });

  it('reminds after a week', () => {
    assert.deepEqual(planAction({ ...base, unsignedSince: NOW - 7 * DAY }), {
      type: 'remind',
      days: 7,
      followUp: false,
    });
  });

  it('does not remind again for the same blockers, or fewer', () => {
    for (const blockers of [[AUTHOR_BLOCKER], []]) {
      const plan = planAction({
        ...base,
        blockers,
        unsignedSince: NOW - 10 * DAY,
        reminders: [sent(3)],
      });
      assert.equal(plan.type, 'wait');
    }
  });

  it('sends one follow-up when something new blocks the check', () => {
    const plan = planAction({
      ...base,
      blockers: ['c0ffee0'],
      unsignedSince: NOW - 40 * DAY,
      reminders: [sent(20)],
    });
    assert.deepEqual(plan, { type: 'remind', days: 40, followUp: true });
  });

  it(`never sends more than ${MAX_REMINDERS} reminders`, () => {
    const plan = planAction({
      ...base,
      blockers: ['beef000'],
      unsignedSince: NOW - 40 * DAY,
      reminders: [sent(30), sent(20, ['c0ffee0'])],
    });
    assert.equal(plan.type, 'close');
  });

  it('compares against the latest reminder', () => {
    const plan = planAction({
      ...base,
      blockers: ['c0ffee0'],
      unsignedSince: NOW - 40 * DAY,
      reminders: [sent(10, ['c0ffee0']), sent(30)],
    });
    assert.equal(plan.type, 'close');
  });

  it('closes after a month once the latest reminder is a week old', () => {
    const plan = planAction({ ...base, unsignedSince: NOW - 31 * DAY, reminders: [sent(8)] });
    assert.equal(plan.type, 'close');
  });

  it('does not close right after a late reminder', () => {
    const plan = planAction({ ...base, unsignedSince: NOW - 200 * DAY, reminders: [sent(2)] });
    assert.equal(plan.type, 'wait');
  });

  it('leaves reopened PRs alone', () => {
    const plan = planAction({
      ...base,
      unsignedSince: NOW - 60 * DAY,
      reminders: [sent(40)],
      closedNoticeAt: NOW - 10 * DAY,
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

interface FakeComment {
  login: string;
  body: string;
  created_at: string;
}

/** A PR the fake serves. Tests mutate it between runs (new commits, CLA state, comments). */
interface FakePR {
  number: number;
  login?: string;
  typename?: string;
  association?: string;
  labels?: string[];
  claState?: string | null;
  closed?: boolean;
  comments?: FakeComment[];
  commits?: Array<{ sha: string; login: string | null; email: string }>;
}

interface FakeFailures {
  /** PRs whose close (`pulls.update` to closed) fails. */
  update?: number[];
  /** PRs whose reopen (`pulls.update` to open) fails. */
  reopen?: number[];
  /** PRs where every comment fails to post. */
  comment?: number[];
  /** PR number → how many close-notice posts fail before one succeeds. */
  closeNotice?: Record<number, number>;
}

const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const botComment = (daysAgo: number, body = SINGLE_COMMITTER_BODY): FakeComment => ({
  login: 'strapi-cla',
  body,
  created_at: iso(daysAgo),
});
const ours = (body: string, daysAgo: number): FakeComment => ({
  login: 'github-actions[bot]',
  body: `${body}\nbody`,
  created_at: iso(daysAgo),
});
/** A reminder that named the blockers of the fake's default commits (the author hasn't signed). */
const reminded = (daysAgo: number, blockers = [AUTHOR_BLOCKER]) =>
  ours(reminderMarker(blockers), daysAgo);
const closedNotice = (daysAgo: number) => ours(CLOSED_MARKER, daysAgo);

const kind = (body: string) =>
  parseReminderMarker(body) ? 'reminder' : hasMarker(body, CLOSED_MARKER) ? 'closed' : 'other';

function fakeGithub(prs: FakePR[], fail: FakeFailures = {}, clock = { now: NOW }) {
  const calls: string[] = [];
  const byNumber = new Map(prs.map((p) => [p.number, p]));
  const noticeFailures = new Map(Object.entries(fail.closeNotice ?? {}).map(([k, v]) => [+k, v]));
  const github = {
    graphql: async () => ({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: prs
            .filter((p) => !p.closed)
            .map((p) => ({
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
    }),
    paginate: async (method: (params: unknown) => Promise<{ data: unknown[] }>, params: unknown) =>
      (await method(params)).data,
    rest: {
      issues: {
        listComments: async ({ issue_number }: { issue_number: number }) => ({
          data: (byNumber.get(issue_number)!.comments ?? []).map((c) => ({
            user: { login: c.login },
            body: c.body,
            created_at: c.created_at,
          })),
        }),
        createComment: async ({ issue_number, body }: { issue_number: number; body: string }) => {
          calls.push(`comment #${issue_number} ${kind(body)}`);
          if (fail.comment?.includes(issue_number)) throw new Error('locked');
          const left = noticeFailures.get(issue_number) ?? 0;
          if (kind(body) === 'closed' && left > 0) {
            noticeFailures.set(issue_number, left - 1);
            throw new Error('502');
          }
          const p = byNumber.get(issue_number)!;
          p.comments = [
            ...(p.comments ?? []),
            { login: 'github-actions[bot]', body, created_at: new Date(clock.now).toISOString() },
          ];
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
        update: async ({ pull_number, state }: { pull_number: number; state: string }) => {
          const closing = state === 'closed';
          calls.push(`${closing ? 'close' : 'reopen'} #${pull_number}`);
          if ((closing ? fail.update : fail.reopen)?.includes(pull_number)) throw new Error('503');
          byNumber.get(pull_number)!.closed = closing;
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

/**
 * Runs the daily job for `days` days on one PR whose CLA bot commented on day 0, calling
 * `onDay` before each run so the test can push commits or change the check. Returns the day of
 * each reminder and the day the PR was closed.
 */
async function simulate(pr: FakePR, days: number, onDay: (day: number) => void = () => {}) {
  const start = NOW - 200 * DAY;
  const clock = { now: start };
  pr.comments = [{ login: 'strapi-cla', body: SINGLE_COMMITTER_BODY, created_at: iso(200) }];
  const { github, calls } = fakeGithub([pr], {}, clock);
  const reminderDays: number[] = [];
  let closedOn: number | null = null;
  for (let day = 0; day <= days && !pr.closed; day++) {
    clock.now = start + day * DAY + 10.5 * 3_600_000; // the 10:30 UTC cron
    onDay(day);
    const before = calls.length;
    await run(github, { now: clock.now });
    for (const call of calls.slice(before)) {
      if (call.endsWith(' reminder')) reminderDays.push(day);
      if (call.startsWith('close #')) closedOn = day;
    }
  }
  return { reminderDays, closedOn, pr };
}

const sha = (prefix: string) => prefix.padEnd(40, '0');

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
    assert.deepEqual(calls, ['comment #8 reminder']);
  });

  it('writes nothing in a dry run', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(20)] },
      { number: 2, comments: [botComment(40), reminded(10)] },
    ]);
    const results = await run(github, { dryRun: true });
    assert.deepEqual(actions(results), { 1: 'remind', 2: 'close' });
    assert.deepEqual(calls, []);
  });

  it("ignores markers in other people's comments and in the middle of a comment", async () => {
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(20), reminded(5)] },
      { number: 2, comments: [botComment(20), { ...reminded(5), login: 'someone' }] },
      {
        number: 3,
        comments: [botComment(20), { ...reminded(5), body: `x ${reminderMarker(['author'])}` }],
      },
      {
        number: 4,
        comments: [botComment(40), reminded(10), { ...closedNotice(2), login: 'someone' }],
      },
      { number: 5, comments: [botComment(40), reminded(10), ours(`> ${CLOSED_MARKER}`, 2)] },
    ]);
    assert.deepEqual(actions(await run(github)), {
      1: 'wait',
      2: 'remind',
      3: 'remind',
      4: 'close',
      5: 'close',
    });
  });

  it('leaves a PR that was reopened after the close notice', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(60), reminded(40), closedNotice(10)] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'reopened' });
    assert.deepEqual(calls, []);
  });

  it('handles a PR closed and reopened by someone else (or the lifecycle job) as usual', async () => {
    const lifecycleClose = ours('> This is a templated message\n\nClosing this PR', 3);
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(40), lifecycleClose] },
      { number: 2, comments: [botComment(40), reminded(10), lifecycleClose] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'remind', 2: 'close' });
  });

  it('closes the PR, then posts the close notice', async () => {
    const { github, calls } = fakeGithub([{ number: 1, comments: [botComment(40), reminded(10)] }]);
    const closed: number[] = [];
    await run(github, { onClosed: async (n) => void closed.push(n) });
    assert.deepEqual(calls, ['close #1', 'comment #1 closed']);
    assert.deepEqual(closed, [1]);
  });

  it('posts no close notice when closing fails, so the next run still closes', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(40), reminded(10)] };
    const first = fakeGithub([pr], { update: [1] });
    const results = await run(first.github);
    assert.equal(results[0].action, 'error');
    assert.deepEqual(first.calls, ['close #1']);

    const second = fakeGithub([pr]);
    assert.deepEqual(actions(await run(second.github)), { 1: 'close' });
  });

  it('retries the close notice once', async () => {
    const { github, calls } = fakeGithub(
      [{ number: 1, comments: [botComment(40), reminded(10)] }],
      {
        closeNotice: { 1: 1 },
      }
    );
    const closed: number[] = [];
    const results = await run(github, { onClosed: async (n) => void closed.push(n) });
    assert.equal(results[0].error, undefined);
    assert.deepEqual(calls, ['close #1', 'comment #1 closed', 'comment #1 closed']);
    assert.deepEqual(closed, [1]);
  });

  it('reopens the PR when the close notice fails twice, and the next run closes again', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(40), reminded(10)] };
    const { github, calls } = fakeGithub([pr], { closeNotice: { 1: 2 } });
    const closed: number[] = [];
    const onClosed = async (n: number) => void closed.push(n);

    const first = await run(github, { onClosed });
    assert.equal(first[0].action, 'error');
    assert.match(first[0].error ?? '', /close notice failed twice \(502\), so the PR was reopened/);
    assert.deepEqual(calls, ['close #1', 'comment #1 closed', 'comment #1 closed', 'reopen #1']);
    assert.equal(pr.closed, false);
    assert.deepEqual(closed, []);

    const second = await run(github, { onClosed });
    assert.deepEqual(actions(second), { 1: 'close' });
    assert.deepEqual(calls.slice(4), ['close #1', 'comment #1 closed']);
    assert.equal(pr.closed, true);
    assert.deepEqual(closed, [1]);
  });

  it('says so when a closed PR is left without a close notice', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(40), reminded(10)] };
    const { github } = fakeGithub([pr], { closeNotice: { 1: 2 }, reopen: [1] });
    const results = await run(github);
    assert.match(results[0].error ?? '', /closed WITHOUT a close notice/);
    assert.equal(pr.closed, true);
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
      { number: 1, comments: [botComment(40), reminded(10)] },
      { number: 2, comments: [botComment(40), reminded(10)] },
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

describe('processUnsignedClaPRs over time', () => {
  it('reminds once and closes on day 30 for a PR that never changes', async () => {
    const { reminderDays, closedOn, pr } = await simulate({ number: 1 }, 60);
    assert.deepEqual(reminderDays, [7]);
    assert.equal(closedOn, 30);
    assert.ok(hasMarker(pr.comments!.at(-1)!.body, CLOSED_MARKER));
  });

  it('still closes at the deadline when force-pushes keep the same blockers', async () => {
    // The unlinked commit stays; the author's own commits are rewritten every 3 days.
    const pr: FakePR = { number: 1 };
    const { reminderDays, closedOn } = await simulate(pr, 60, (day) => {
      if (day % 3) return;
      pr.commits = [
        { sha: sha('bad1'), login: null, email: 'someone@example.com' },
        { sha: sha(`f${day}`), login: 'author', email: 'a@example.com' },
      ];
    });
    assert.deepEqual(reminderDays, [7]);
    assert.equal(closedOn, 30);
  });

  it('sends one follow-up for a new blocker, never a third reminder, then closes', async () => {
    const pr: FakePR = { number: 1 };
    const listBody = (unsigned: string) => `:white_check_mark: author<br/>:x: ${unsigned}<br/>`;
    const { reminderDays, closedOn } = await simulate(pr, 60, (day) => {
      // Day 12: the author signs. Day 20: a commit with an unlinked email arrives, and the
      // CLA bot updates its comment to list both committers. Day 25: another one.
      if (day === 12) pr.claState = 'SUCCESS';
      if (day === 20) {
        pr.claState = 'PENDING';
        pr.comments![0].body = listBody('Someone');
        pr.commits = [
          { sha: sha('a1'), login: 'author', email: 'a@example.com' },
          { sha: sha('c0ffee'), login: null, email: 'someone@example.com' },
        ];
      }
      if (day === 25) {
        pr.commits = [...pr.commits!, { sha: sha('beef'), login: null, email: 'x@example.com' }];
      }
    });
    assert.deepEqual(reminderDays, [7, 20]);
    assert.equal(closedOn, 30);

    const followUp = pr.comments!.filter((c) => parseReminderMarker(c.body))[1].body;
    assert.deepEqual(parseReminderMarker(followUp), [sha('c0ffee')]);
    assert.match(followUp, /something new is blocking it/);
    assert.doesNotMatch(followUp, /You haven't signed/);
    assert.doesNotMatch(followUp, EMAIL_RE);
  });

  it('gives a late follow-up its own week before closing', async () => {
    const late: FakePR = { number: 1 };
    const second = await simulate(late, 60, (day) => {
      // Day 25: a co-author the CLA bot lists as unsigned pushes a commit.
      if (day === 25) {
        late.comments![0].body = ':x: author<br/>:x: other<br/>';
        late.commits = [
          { sha: sha('a1'), login: 'author', email: 'a@example.com' },
          { sha: sha('d2'), login: 'other', email: 'o@example.com' },
        ];
      }
    });
    assert.deepEqual(second.reminderDays, [7, 25]);
    assert.equal(second.closedOn, 32);
  });
});

describe('cancelLinearTicket', () => {
  const config = {
    apiKey: 'test-key',
    cprTeamId: 'cpr',
    cmsTeamId: 'cms',
    cmsCanceledStateId: 's',
  };
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('throws instead of reading a Linear error as "no ticket"', async () => {
    const failures = [
      respond(400, { errors: [{ message: 'Authentication required' }] }),
      respond(400, { errors: [{ message: 'Rate limit exceeded' }] }),
      respond(200, { data: null, errors: [{ message: 'Entity not found' }] }),
      respond(200, { data: null }),
      new Response('Bad gateway', { status: 502 }),
    ];
    for (const res of failures) {
      await assert.rejects(
        cancelLinearTicket(
          1,
          config,
          () => {},
          async () => res
        ),
        /^Error: Linear: /
      );
    }
  });

  it('cancels the ticket in the first team that has it', async () => {
    const queries: string[] = [];
    const logs: string[] = [];
    await cancelLinearTicket(
      7,
      config,
      (m) => logs.push(m),
      async (_url, init) => {
        const { query, variables } = JSON.parse(String(init.body));
        queries.push(query.includes('issueUpdate') ? 'update' : `find ${variables.teamId}`);
        if (query.includes('issueUpdate'))
          return respond(200, { data: { issueUpdate: { success: true } } });
        const nodes = variables.teamId === 'cms' ? [{ id: 'i1', title: 'PR #7: x' }] : [];
        return respond(200, { data: { issues: { nodes } } });
      }
    );
    assert.deepEqual(queries, ['find cpr', 'find cms', 'update']);
    assert.deepEqual(logs, ['PR #7: Linear CMS → "Canceled"']);
  });

  it('logs when the key or team ids are missing', async () => {
    const logs: string[] = [];
    const fetchNever = async (): Promise<Response> => assert.fail('no request without a key');
    await cancelLinearTicket(1, {}, (m) => logs.push(m), fetchNever);
    assert.match(logs[0], /LINEAR_API_KEY is not set/);

    logs.length = 0;
    await cancelLinearTicket(1, { apiKey: 'test-key' }, (m) => logs.push(m), fetchNever);
    assert.match(logs[0], /team id not set for CPR, CMS/);
    assert.match(logs[1], /no Linear ticket found/);
  });
});
