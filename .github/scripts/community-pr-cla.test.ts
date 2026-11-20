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
  parseClaBotComment,
  planAction,
  type CommitInfo,
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
    assert.equal(d.commitCount, 1);
    assert.equal(d.hasMergeCommits, true);
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
    assert.match(body, /--reset-author/);
  });

  it('offers both fixes for an email that can be added', () => {
    const body = reminder(cases.unlinked);
    assert.match(body, /Add the email on commit `c100000`/);
    assert.match(body, /\[recheck\]/);
    assert.match(body, /git rebase --exec .* HEAD~1/);
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
  const base = { now: NOW, reminderDays: 7, closeDays: 30, reminderAt: null, closedNoticeAt: null };

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
