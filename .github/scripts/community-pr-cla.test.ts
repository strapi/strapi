import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLOSED_MARKER,
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
  resolveReminderBody,
  MAX_PR_COMMITS,
  type BlockerKind,
  resolvedMarker,
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
    closeOn: new Date(NOW + 23 * DAY),
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

  it('reads entries separated by newlines or any <br> spelling', () => {
    const parsed = parseClaBotComment(':x:  one <br>:white_check_mark: two<br />\n:x: three', 'x');
    assert.deepEqual(parsed.unsigned, ['one', 'three']);
    assert.deepEqual(parsed.signed, ['two']);
  });

  it('stays fast on a crafted name', () => {
    // Git author names end up in the comment: a long run of spaces must not stall the job.
    const started = performance.now();
    const parsed = parseClaBotComment(`:x:${' '.repeat(200_000)}<x\n:x: real`, 'x');
    assert.deepEqual(parsed.unsigned, ['real']);
    assert.ok(performance.now() - started < 500);
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

  it('does not trust a ❌ name that is the git name of an unlinked commit', () => {
    // The CLA bot writes the git author name for an unlinked commit, and anyone can pick a git
    // name that equals someone's login.
    const d = diagnose(
      'author',
      [
        commit('a1', 'author', 'a@example.com'),
        commit('a2', 'victim', 'victim@users.noreply.github.com'),
        commit('b1', null, 'x@example.com', 'victim'),
        commit('b2', null, 'y@example.com', 'Author'),
      ],
      parseClaBotComment(':white_check_mark: author<br/>:x: victim<br/>:x: Author<br/>', 'x')
    );
    assert.deepEqual(d.otherUnsigned, []);
    assert.equal(d.authorUnsigned, false);
    assert.equal(d.unlinked.length, 2);
    assert.doesNotMatch(reminder(d), /@victim|isn't signed for your account/);
  });

  it('does not trust a ❌ name the CLA bot also lists as signed', () => {
    const d = diagnose(
      'author',
      [commit('a1', 'author', 'a@example.com'), commit('a2', 'victim', 'v@example.com')],
      parseClaBotComment(
        ':white_check_mark: author<br/>:white_check_mark: victim<br/>:x: victim<br/>:x: author',
        'x'
      )
    );
    assert.deepEqual(d.otherUnsigned, []);
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

  it('starts with the reminder marker, which carries the close date', () => {
    assert.deepEqual(parseReminderMarker(reminder(cases.plain)), {
      state: 'active',
      date: NOW + 23 * DAY,
      named: ['author'],
    });
  });

  it('states no duration', () => {
    // The check may have passed in between, so "pending for N days" could be false.
    for (const [name, d] of Object.entries(cases)) {
      assert.doesNotMatch(reminder(d), /\d+ days/, name);
    }
  });

  it('links the CLA and the recheck for an author whose account has not signed', () => {
    // The author may have signed already (say they just added the commit email to their
    // account), so the reminder doesn't say they haven't, and points to the recheck.
    const body = reminder(cases.plain);
    assert.match(body, /The CLA isn't signed for your account yet/);
    assert.match(body, /If you already have, click \[recheck\]/);
    assert.doesNotMatch(body, /You haven't signed/);
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
    assert.equal(parseReminderMarker(body)?.state, 'active');
  });

  it('offers both fixes for an email that can be added', () => {
    const body = reminder(cases.unlinked);
    assert.match(body, /Add the email on commit `c100000`/);
    assert.match(body, /\[recheck\]/);
    assert.match(body, /git log -1 --format=%ae c100000/);
  });

  it('names co-authors who have not signed, without notifying them', () => {
    const body = reminder(cases.coAuthor);
    assert.match(body, /- `other`: `d200000`/);
    assert.doesNotMatch(body, /@other/);
    assert.doesNotMatch(body, /isn't signed for your account/);
  });
});

describe('reminder marker', () => {
  // 10:30 UTC on the 19th: the marker keeps the day only.
  const at = NOW + 10.5 * 3_600_000;

  it('records the close date and reads it back as the start of that UTC day', () => {
    const marker = reminderMarker(new Date(at), ['author', 'unlinked']);
    assert.equal(
      marker,
      '<!-- community-pr-cla: reminder close-on=2026-11-19 named=author,unlinked -->'
    );
    assert.deepEqual(parseReminderMarker(`${marker}\nbody`), {
      state: 'active',
      date: NOW,
      named: ['author', 'unlinked'],
    });
  });

  it('records only the kinds of blockers, never a name, a SHA or an email', () => {
    const marker = reminderMarker(new Date(at), ['me@example.com', '-->', 'co-author'] as never);
    assert.equal(marker, '<!-- community-pr-cla: reminder close-on=2026-11-19 named=co-author -->');
    assert.deepEqual(parseReminderMarker(reminderMarker(new Date(at), []))?.named, []);
  });

  it('records the day a reminder was resolved', () => {
    const marker = resolvedMarker(at);
    assert.equal(marker, '<!-- community-pr-cla: reminder resolved=2026-11-19 -->');
    assert.deepEqual(parseReminderMarker(marker), { state: 'resolved', date: NOW, named: [] });
  });

  it('only matches at the start of the body', () => {
    assert.equal(parseReminderMarker(`hi ${reminderMarker(new Date(at), [])}`), null);
    assert.equal(parseReminderMarker(null), null);
    assert.equal(parseReminderMarker(CLOSED_MARKER), null);
  });

  it('rejects a marker without a real date', () => {
    for (const value of ['close-on=', 'close-on=soon', 'close-on=2026-13-45', 'blockers=author']) {
      assert.equal(parseReminderMarker(`<!-- community-pr-cla: reminder ${value} -->`), null);
    }
  });

  it('resolving keeps the reminder text under a note', () => {
    const d = diagnose('author', [commit('a1', 'author', 'me@example.com')], null);
    const resolved = resolveReminderBody(reminder(d), at);
    const [first, second, third] = resolved.split('\n');
    assert.equal(first, resolvedMarker(at));
    assert.match(second, /the CLA check has passed/);
    assert.equal(third, '');
    assert.ok(resolved.endsWith(reminder(d).split('\n').slice(1).join('\n')));
    assert.equal(resolved.match(/<!--/g)?.length, 1);
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
    assert.doesNotMatch(body, /isn't signed for your account/);
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
  it('has the marker and a reopen hint, and states no duration', () => {
    const body = buildCloseComment({ login: 'author', claUrl: 'https://cla.example' });
    assert.ok(body.startsWith(CLOSED_MARKER));
    assert.match(body, /reopen/);
    // The check may have passed in between, so "pending for N days" could be false.
    assert.doesNotMatch(body, /\d+ days/);
  });
});

describe('planAction', () => {
  const base = { now: NOW, reminderDays: 7, closeOn: null, unnamed: false, closed: false };

  it('waits during the first week', () => {
    assert.equal(planAction({ ...base, pendingSince: NOW - 6 * DAY }).type, 'too-early');
  });

  it('reminds after a week', () => {
    assert.deepEqual(planAction({ ...base, pendingSince: NOW - 7 * DAY }), {
      type: 'remind',
      days: 7,
      why: 'first',
    });
  });

  it('waits until the date the reminder stated', () => {
    const plan = planAction({ ...base, pendingSince: NOW - 29 * DAY, closeOn: NOW + DAY });
    assert.deepEqual(plan, { type: 'wait', days: 29, closeOn: NOW + DAY });
  });

  it('closes from the stated date on', () => {
    for (const late of [0, 1, 6]) {
      const plan = planAction({ ...base, pendingSince: NOW - 40 * DAY, closeOn: NOW - late * DAY });
      assert.equal(plan.type, 'close', `${late}d after the date`);
    }
  });

  it('never closes without an active reminder, however long the check has been pending', () => {
    const plan = planAction({ ...base, pendingSince: NOW - 500 * DAY });
    assert.equal(plan.type, 'remind');
  });

  it('reminds again instead of closing when the stated date is long past', () => {
    const plan = planAction({ ...base, pendingSince: NOW - 90 * DAY, closeOn: NOW - 7 * DAY });
    assert.deepEqual(plan, { type: 'remind', days: 90, why: 'missed-date' });
  });

  it('reminds again instead of waiting or closing on a kind of blocker no reminder named', () => {
    for (const closeOn of [NOW + 10 * DAY, NOW, NOW - 3 * DAY]) {
      const plan = planAction({ ...base, pendingSince: NOW - 40 * DAY, closeOn, unnamed: true });
      assert.deepEqual(plan, { type: 'remind', days: 40, why: 'new-blocker' });
    }
  });

  it('leaves reopened PRs alone', () => {
    const plan = planAction({ ...base, pendingSince: NOW - 60 * DAY, closeOn: NOW, closed: true });
    assert.equal(plan.type, 'reopened');
  });
});

describe('closeDate', () => {
  it('gives a reminder sent on day 7 until day 30', () => {
    const d = closeDate({ now: NOW, reminderDays: 7, closeDays: 30 });
    assert.equal(d.getTime(), NOW + 23 * DAY);
  });

  it('never gives less than the reminder threshold', () => {
    const d = closeDate({ now: NOW, reminderDays: 7, closeDays: 10 });
    assert.equal(d.getTime(), NOW + 7 * DAY);
  });
});

// ─── processUnsignedClaPRs with a fake Octokit ──────────────────────────────

interface FakeComment {
  id?: number;
  login: string;
  body: string;
  created_at: string;
}

/** A PR the fake serves. Tests mutate it between runs (new commits, CLA state, labels). */
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
  /** PRs whose close fails. */
  close?: number[];
  /** PRs where every comment fails to post. */
  comment?: number[];
  /** PRs where editing a comment fails. */
  edit?: number[];
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
/**
 * A reminder sent `daysAgo` days ago. Like the real ones, it closes the PR 23 days later. By
 * default it named what blocks the fake's default commits: the author hasn't signed.
 */
const reminded = (daysAgo: number, named: BlockerKind[] = ['author']) =>
  ours(reminderMarker(new Date(NOW + (23 - daysAgo) * DAY), named), daysAgo);
const closedNotice = (daysAgo: number) => ours(CLOSED_MARKER, daysAgo);

const kind = (body: string) => {
  const mark = parseReminderMarker(body);
  if (mark) return mark.state === 'active' ? 'reminder' : 'resolved';
  return hasMarker(body, CLOSED_MARKER) ? 'closed' : 'other';
};

function fakeGithub(prs: FakePR[], fail: FakeFailures = {}, clock = { now: NOW }) {
  const calls: string[] = [];
  const byNumber = new Map(prs.map((p) => [p.number, p]));
  let nextId = 1;
  const github = {
    graphql: async () => ({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: prs
            .filter((p) => !p.closed)
            .map((p) => ({
              number: p.number,
              createdAt: iso(300),
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
        listComments: async ({ issue_number }: { issue_number: number }) => {
          calls.push(`list #${issue_number}`);
          return {
            data: (byNumber.get(issue_number)!.comments ?? []).map((c) => {
              c.id ??= nextId++;
              return {
                id: c.id,
                user: { login: c.login },
                body: c.body,
                created_at: c.created_at,
              };
            }),
          };
        },
        createComment: async ({ issue_number, body }: { issue_number: number; body: string }) => {
          calls.push(`comment #${issue_number} ${kind(body)}`);
          if (fail.comment?.includes(issue_number)) throw new Error('locked');
          const p = byNumber.get(issue_number)!;
          p.comments = [
            ...(p.comments ?? []),
            { login: 'github-actions[bot]', body, created_at: new Date(clock.now).toISOString() },
          ];
          return {};
        },
        updateComment: async ({ comment_id, body }: { comment_id: number; body: string }) => {
          const p = prs.find((pr) => pr.comments?.some((c) => c.id === comment_id))!;
          calls.push(`edit #${p.number} ${kind(body)}`);
          if (fail.edit?.includes(p.number)) throw new Error('502');
          p.comments!.find((c) => c.id === comment_id)!.body = body;
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
        update: async ({ pull_number }: { pull_number: number; state: string }) => {
          calls.push(`close #${pull_number}`);
          if (fail.close?.includes(pull_number)) throw new Error('503');
          byNumber.get(pull_number)!.closed = true;
          return {};
        },
      },
    },
  };
  /** The calls that change something on GitHub. */
  const writes = () => calls.filter((c) => !c.startsWith('list '));
  return { github, calls, writes };
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
    const { github, writes } = fakeGithub([
      { number: 1, login: 'dependabot[bot]', typename: 'Bot', comments: [botComment(20)] },
      { number: 2, association: 'MEMBER', comments: [botComment(20)] },
      { number: 3, claState: 'SUCCESS', comments: [botComment(20)] },
      { number: 4, labels: ['waiting on author', 'community'], comments: [botComment(20)] },
      { number: 5, labels: ['Stale', 'Community'], comments: [botComment(20)] },
      { number: 6, labels: ['pr: security'], comments: [botComment(20)] },
      { number: 7, claState: null, comments: [botComment(20)] },
      { number: 8, comments: [botComment(20)] },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 8: 'remind' });
    assert.deepEqual(writes(), ['comment #8 reminder']);
  });

  it('only leaves lifecycle-labelled PRs to the lifecycle flow when they are `community`', async () => {
    // The lifecycle flow only handles `community` PRs: without that label, nothing else would
    // ever follow up on or close the PR.
    const { github, writes } = fakeGithub([
      { number: 1, labels: ['waiting on author'], comments: [botComment(20)] },
      { number: 2, labels: ['stale'], comments: [botComment(20)] },
      { number: 3, labels: ['waiting on author', 'community'], comments: [botComment(20)] },
      { number: 4, labels: ['pr: security'], comments: [botComment(20)] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'remind', 2: 'remind' });
    assert.deepEqual(writes(), ['comment #1 reminder', 'comment #2 reminder']);
  });

  it('writes nothing in a dry run', async () => {
    const { github, writes } = fakeGithub([
      { number: 1, comments: [botComment(20)] },
      { number: 2, comments: [botComment(40), reminded(25)] },
      { number: 3, claState: 'SUCCESS', comments: [botComment(40), reminded(10)] },
    ]);
    const results = await run(github, { dryRun: true });
    assert.deepEqual(actions(results), { 1: 'remind', 2: 'close', 3: 'resolved' });
    assert.deepEqual(writes(), []);
  });

  it('reminds, waits for the stated date, then closes', async () => {
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(6)] },
      { number: 2, comments: [botComment(7)] },
      { number: 3, comments: [botComment(29), reminded(22)] },
      { number: 4, comments: [botComment(30), reminded(23)] },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'too-early', 2: 'remind', 3: 'wait', 4: 'close' });
    assert.equal(results[2].detail, 'closes on 2026-11-20');
  });

  it('never closes a PR that has no active reminder', async () => {
    const { github, writes } = fakeGithub([
      { number: 1, comments: [botComment(250)] },
      { number: 2, comments: [botComment(250), ours(resolvedMarker(NOW - 200 * DAY), 240)] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'remind', 2: 'remind' });
    assert.deepEqual(writes(), ['comment #1 reminder', 'comment #2 reminder']);
  });

  it('states the close date in the reminder and in its marker', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(7)] };
    await run(fakeGithub([pr]).github);
    const body = pr.comments!.at(-1)!.body;
    assert.deepEqual(parseReminderMarker(body), {
      state: 'active',
      date: NOW + 23 * DAY,
      named: ['author'],
    });
    assert.match(body, /still pending on \*\*December 12, 2026\*\*/);
    assert.doesNotMatch(body, /replaces our earlier reminder/);
  });

  it('marks the reminder as resolved once the check passes', async () => {
    const pr: FakePR = { number: 1, claState: 'SUCCESS', comments: [botComment(20), reminded(10)] };
    const { github, writes } = fakeGithub([pr]);
    assert.deepEqual(actions(await run(github)), { 1: 'resolved' });
    assert.deepEqual(writes(), ['edit #1 resolved']);
    const body = pr.comments![1].body;
    assert.deepEqual(parseReminderMarker(body), { state: 'resolved', date: NOW, named: [] });
    assert.match(body, /the CLA check has passed/);

    // Nothing left to do on the next run.
    assert.deepEqual(await run(github), []);
    assert.deepEqual(writes(), ['edit #1 resolved']);
  });

  it('starts over when the check goes pending again after it passed', async () => {
    const resolved = (daysAgo: number) => ours(resolvedMarker(NOW - daysAgo * DAY), 60);
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(90), resolved(3)] },
      { number: 2, comments: [botComment(90), resolved(7)] },
    ]);
    // The old reminder's date passed long ago, and still nothing is closed.
    assert.deepEqual(actions(await run(github)), { 1: 'too-early', 2: 'remind' });
  });

  it('reports a reminder it could not mark as resolved, and tries again', async () => {
    const pr: FakePR = { number: 1, claState: 'SUCCESS', comments: [botComment(20), reminded(10)] };
    const results = await run(fakeGithub([pr], { edit: [1] }).github);
    assert.equal(results[0].error, '502');
    assert.deepEqual(actions(await run(fakeGithub([pr]).github)), { 1: 'resolved' });
  });

  it('reminds again instead of closing when the stated date is long past', async () => {
    const { github, writes } = fakeGithub([
      { number: 1, comments: [botComment(60), reminded(29)] },
      { number: 2, comments: [botComment(60), reminded(30)] },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'close', 2: 'remind' });
    assert.match(results[1].detail, /^missed close date: /);
    assert.deepEqual(writes(), ['close #1', 'comment #1 closed', 'comment #2 reminder']);
  });

  it('reminds again, with a new date, when a kind of blocker no reminder named appears', async () => {
    const unlinked = { sha: 'c0ffee'.padEnd(40, '0'), login: null, email: 'x@example.com' };
    const author = { sha: 'a1'.padEnd(40, '0'), login: 'author', email: 'a@example.com' };
    const pr = (number: number, comments: FakeComment[]): FakePR => ({
      number,
      comments,
      commits: [author, unlinked],
    });
    const prs = [
      // Due today, but the reminder only said the author hadn't signed.
      pr(1, [botComment(40), reminded(23)]),
      // Not due yet: the author is told right away.
      pr(2, [botComment(40), reminded(5)]),
      // The reminder named unlinked commits: other unlinked commits are nothing new.
      pr(3, [botComment(40), reminded(23, ['unlinked'])]),
      // Named by an earlier active reminder.
      pr(4, [botComment(60), reminded(28, ['unlinked']), reminded(23, ['author'])]),
    ];
    const { github, writes } = fakeGithub(prs);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'remind', 2: 'remind', 3: 'close', 4: 'close' });
    assert.match(results[0].detail, /^new blocker: 1 unlinked commit/);
    assert.equal(writes().filter((c) => c.startsWith('close')).length, 2);

    const body = prs[0].comments!.at(-1)!.body;
    assert.deepEqual(parseReminderMarker(body)?.named, ['unlinked']);
    assert.match(body, /replaces our earlier reminder/);
    assert.match(body, /still pending on \*\*December 12, 2026\*\*/);

    // Now every kind is named: the new reminder isn't followed by another.
    assert.deepEqual(actions(await run(github)), { 1: 'wait', 2: 'wait' });
  });

  it('skips a PR with more commits than GitHub lists, instead of acting on a partial list', async () => {
    const commits = Array.from({ length: MAX_PR_COMMITS }, (_, i) => ({
      sha: i.toString(16).padStart(40, '0'),
      login: 'author',
      email: 'a@example.com',
    }));
    const { github, writes } = fakeGithub([
      { number: 1, commits, comments: [botComment(20)] },
      { number: 2, commits, comments: [botComment(40), reminded(25)] },
    ]);
    const results = await run(github);
    assert.deepEqual(actions(results), { 1: 'skipped', 2: 'skipped' });
    assert.match(results[0].detail, /250\+ commits/);
    assert.deepEqual(writes(), []);
  });

  it('goes by the latest active reminder', async () => {
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(90), reminded(60), reminded(5)] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'wait' });
  });

  it("ignores markers in other people's comments and in the middle of a comment", async () => {
    const marker = reminderMarker(new Date(NOW - DAY), ['author']);
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(40), reminded(25)] },
      { number: 2, comments: [botComment(40), { ...reminded(25), login: 'someone' }] },
      { number: 3, comments: [botComment(40), { ...reminded(25), body: `x ${marker}` }] },
      {
        number: 4,
        comments: [botComment(40), reminded(25), { ...closedNotice(2), login: 'someone' }],
      },
      { number: 5, comments: [botComment(40), reminded(25), ours(`> ${CLOSED_MARKER}`, 2)] },
    ]);
    assert.deepEqual(actions(await run(github)), {
      1: 'close',
      2: 'remind',
      3: 'remind',
      4: 'close',
      5: 'close',
    });
  });

  it('leaves a PR that was reopened after the close notice', async () => {
    const { github, writes } = fakeGithub([
      { number: 1, comments: [botComment(60), reminded(40), closedNotice(10)] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'reopened' });
    assert.deepEqual(writes(), []);
  });

  it('does not treat a PR closed by someone else (or the lifecycle job) as reopened', async () => {
    const lifecycleClose = ours('> This is a templated message\n\nClosing this PR', 3);
    const { github } = fakeGithub([
      { number: 1, comments: [botComment(40), lifecycleClose] },
      { number: 2, comments: [botComment(40), reminded(25), lifecycleClose] },
    ]);
    assert.deepEqual(actions(await run(github)), { 1: 'remind', 2: 'close' });
  });

  it('closes the PR, then posts the close notice', async () => {
    const { github, writes } = fakeGithub([
      { number: 1, comments: [botComment(40), reminded(25)] },
    ]);
    const closed: number[] = [];
    await run(github, { onClosed: async (n) => void closed.push(n) });
    assert.deepEqual(writes(), ['close #1', 'comment #1 closed']);
    assert.deepEqual(closed, [1]);
  });

  it('posts no close notice when closing fails, so the next run still closes', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(40), reminded(25)] };
    const first = fakeGithub([pr], { close: [1] });
    const closed: number[] = [];
    const results = await run(first.github, { onClosed: async (n) => void closed.push(n) });
    assert.equal(results[0].error, '503');
    assert.deepEqual(first.writes(), ['close #1']);
    assert.deepEqual(closed, []);

    const second = fakeGithub([pr]);
    assert.deepEqual(actions(await run(second.github)), { 1: 'close' });
    assert.deepEqual(second.writes(), ['close #1', 'comment #1 closed']);
  });

  it('keeps the PR closed, syncs Linear and says so when the notice cannot be posted', async () => {
    const pr: FakePR = { number: 1, comments: [botComment(40), reminded(25)] };
    const { github, writes } = fakeGithub([pr], { comment: [1] });
    const closed: number[] = [];
    const results = await run(github, { onClosed: async (n) => void closed.push(n) });
    assert.match(results[0].error ?? '', /^closed, but: the close notice could not be posted/);
    assert.match(results[0].error ?? '', /post it by hand \(locked\)/);
    // No retry and no reopen.
    assert.deepEqual(writes(), ['close #1', 'comment #1 closed']);
    assert.ok(pr.closed);
    assert.deepEqual(closed, [1]);
  });

  it('keeps going after a PR fails, and reports it', async () => {
    const { github, writes } = fakeGithub(
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
    assert.equal(writes().length, 2);
  });

  it('does not let a failing onClosed stop the run', async () => {
    const { github, calls } = fakeGithub([
      { number: 1, comments: [botComment(40), reminded(25)] },
      { number: 2, comments: [botComment(40), reminded(25)] },
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
    assert.equal(results[0].error, 'closed, but: linear down');
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

/**
 * Runs the daily job for `days` days on one PR whose CLA bot commented on day 0, calling
 * `onDay` before each run so the test can push commits, change the check or the labels, or
 * close and reopen the PR. Returns the days of each reminder, of each resolve, and of our close.
 */
async function simulate(pr: FakePR, days: number, onDay: (day: number) => void = () => {}) {
  const start = NOW - 200 * DAY;
  const clock = { now: start };
  pr.comments = [{ login: 'strapi-cla', body: SINGLE_COMMITTER_BODY, created_at: iso(200) }];
  const { github, calls } = fakeGithub([pr], {}, clock);
  const reminderDays: number[] = [];
  const resolvedDays: number[] = [];
  let closedOn: number | null = null;
  for (let day = 0; day <= days && closedOn === null; day++) {
    clock.now = start + day * DAY + 10.5 * 3_600_000; // the 10:30 UTC cron
    onDay(day);
    const before = calls.length;
    await run(github, { now: clock.now });
    for (const call of calls.slice(before)) {
      if (call === 'comment #1 reminder') reminderDays.push(day);
      if (call === 'edit #1 resolved') resolvedDays.push(day);
      if (call === 'close #1') closedOn = day;
    }
  }
  return { reminderDays, resolvedDays, closedOn, pr };
}

const sha = (prefix: string) => prefix.padEnd(40, '0');

describe('processUnsignedClaPRs over time', () => {
  it('reminds on day 7 and closes on day 30 for a PR that never changes', async () => {
    const { reminderDays, closedOn, pr } = await simulate({ number: 1 }, 60);
    assert.deepEqual(reminderDays, [7]);
    assert.equal(closedOn, 30);
    assert.ok(hasMarker(pr.comments!.at(-1)!.body, CLOSED_MARKER));
  });

  it('sends one reminder and closes on its date, however often the author rebases', async () => {
    // Every 3 days, all commits get new SHAs and one more unlinked commit is added.
    const pr: FakePR = { number: 1 };
    const { reminderDays, closedOn } = await simulate(pr, 60, (day) => {
      if (day % 3) return;
      pr.commits = Array.from({ length: 1 + day / 3 }, (_, i) => ({
        sha: sha(`f${day}a${i}`),
        login: null,
        email: 'someone@example.com',
      }));
    });
    assert.deepEqual(reminderDays, [7]);
    assert.equal(closedOn, 30);
  });

  it('never closes on a blocker no reminder named, and moves the date at most twice', async () => {
    // The author hasn't signed (reminded on day 7). Day 20: an unlinked commit. Day 25: a
    // co-author the CLA bot lists as unsigned. After that, more of the same kinds every day.
    const pr: FakePR = { number: 1 };
    const author = { sha: sha('a1'), login: 'author', email: 'a@example.com' };
    const { reminderDays, closedOn } = await simulate(pr, 120, (day) => {
      pr.commits = [author];
      if (day >= 20) pr.commits.push({ sha: sha(`bad${day}`), login: null, email: 'x@e.io' });
      if (day >= 25) {
        pr.comments![0].body = ':x: author<br/>:x: other<br/>';
        pr.commits.push({ sha: sha(`d${day}`), login: 'other', email: 'o@example.com' });
      }
    });
    assert.deepEqual(reminderDays, [7, 20, 25]);
    assert.equal(closedOn, 48);

    const named = pr.comments!.flatMap((c) => parseReminderMarker(c.body)?.named ?? []);
    // With an unlinked commit and no committer list, the day-20 reminder can't tell whether the
    // author signed, so it only names the commit.
    assert.deepEqual(named, ['author', 'unlinked', 'author', 'unlinked', 'co-author']);
  });

  it('does nothing more once the author signs', async () => {
    const pr: FakePR = { number: 1 };
    const { reminderDays, resolvedDays, closedOn } = await simulate(pr, 90, (day) => {
      if (day === 12) pr.claState = 'SUCCESS';
    });
    assert.deepEqual(reminderDays, [7]);
    assert.deepEqual(resolvedDays, [12]);
    assert.equal(closedOn, null);
  });

  it('gives a new reminder and a full window when the check goes pending again', async () => {
    // Reminded on day 7, signed on day 12, an unlinked commit arrives on day 14.
    const pr: FakePR = { number: 1 };
    const { reminderDays, resolvedDays, closedOn } = await simulate(pr, 90, (day) => {
      if (day === 12) pr.claState = 'SUCCESS';
      if (day === 14) {
        pr.claState = 'PENDING';
        pr.commits = [
          { sha: sha('a1'), login: 'author', email: 'a@example.com' },
          { sha: sha('c0ffee'), login: null, email: 'someone@example.com' },
        ];
      }
    });
    // Not closed on day 30, the first reminder's date: that reminder was resolved.
    assert.deepEqual(resolvedDays, [12]);
    assert.deepEqual(reminderDays, [7, 19]);
    assert.equal(closedOn, 42);

    const second = pr.comments!.filter((c) => kind(c.body) === 'reminder').at(-1)!.body;
    assert.match(second, /`c0ffee0`/);
    assert.doesNotMatch(second, /isn't signed for your account/);
    assert.doesNotMatch(second, EMAIL_RE);
  });

  it('does not close a PR whose check was green on the stated date', async () => {
    // Reminded on day 7 for day 30. Green on days 30-32, pending again on day 33.
    const pr: FakePR = { number: 1 };
    const { reminderDays, resolvedDays, closedOn } = await simulate(pr, 90, (day) => {
      if (day === 30) pr.claState = 'SUCCESS';
      if (day === 33) pr.claState = 'PENDING';
    });
    assert.deepEqual(resolvedDays, [30]);
    assert.deepEqual(reminderDays, [7, 37]);
    assert.equal(closedOn, 60);
  });

  it('reminds again before closing a PR whose check was green for months', async () => {
    const pr: FakePR = { number: 1 };
    const { reminderDays, closedOn } = await simulate(pr, 150, (day) => {
      if (day === 9) pr.claState = 'SUCCESS';
      if (day === 100) pr.claState = 'PENDING';
    });
    assert.deepEqual(reminderDays, [7, 100]);
    assert.equal(closedOn, 123);
    for (const c of pr.comments!) assert.doesNotMatch(c.body, /\d+ days/);
  });

  it('closes late after a short exemption, and reminds again after a long one', async () => {
    const exemptBetween = (from: number, to: number) => async () => {
      const pr: FakePR = { number: 1 };
      return simulate(pr, 120, (day) => {
        pr.labels = day >= from && day < to ? ['pr: security'] : [];
      });
    };
    const short = await exemptBetween(28, 33)();
    assert.deepEqual(short.reminderDays, [7]);
    assert.equal(short.closedOn, 33);

    const long = await exemptBetween(20, 45)();
    assert.deepEqual(long.reminderDays, [7, 45]);
    assert.equal(long.closedOn, 68);
  });

  it('reminds again when someone reopens a PR long after its close date', async () => {
    // A maintainer closes the PR on day 20 and reopens it on day 50.
    const pr: FakePR = { number: 1 };
    const { reminderDays, closedOn } = await simulate(pr, 120, (day) => {
      pr.closed = day >= 20 && day < 50;
    });
    assert.deepEqual(reminderDays, [7, 50]);
    assert.equal(closedOn, 73);
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
