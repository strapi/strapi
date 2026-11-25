/**
 * Follows up on community PRs whose CLA (CLA Assistant, `license/cla` status) is still unsigned.
 *
 *   pending ≥ CLA_REMINDER_DAYS, no active reminder → a reminder that says exactly what blocks
 *                                                     the check, and the date the PR closes on
 *   a kind of blocker the reminder didn't name      → a new reminder, with a new date
 *   still pending on that date                      → close the PR
 *   the check passes                                → the reminder is marked as resolved
 *
 * The reminder is the only state. A PR is closed only on an active reminder whose date has
 * come, and a reminder stops being active as soon as a run sees the check pass. So a PR is
 * never closed without a reminder that was about the current pending period.
 *
 * Commit emails are never written to comments or logs: commits are referred to by SHA.
 */

import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export const CLA_STATUS_CONTEXT = 'license/cla';
export const CLA_BOT_LOGIN = 'strapi-cla';
export const ACTIONS_BOT_LOGIN = 'github-actions[bot]';
export const CLOSED_MARKER = '<!-- community-pr-cla: closed -->';

/** Associations that mean the author is part of the org (or has write access). */
const INTERNAL_ASSOCIATIONS = new Set(['MEMBER', 'OWNER', 'COLLABORATOR']);

/**
 * `community` PRs carrying a lifecycle label are left to the community-pr-lifecycle flow: a
 * maintainer is already following up by hand, and that flow decides when the PR is closed.
 * That flow only handles `community` PRs, so on any other PR these labels exempt nothing, or
 * the PR would never be followed up on or closed.
 */
export const LIFECYCLE_LABELS = ['waiting on author', 'stale'];
export const COMMUNITY_LABEL = 'community';

const DAY_MS = 86_400_000;

const ADD_EMAIL_DOCS =
  'https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/adding-an-email-address-to-your-github-account';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CommitInfo {
  sha: string;
  /** GitHub login the commit author email resolves to, or null when GitHub can't link it. */
  login: string | null;
  /** Git author name. Shown in comments only when it doesn't look like an email. */
  name: string;
  /** Git author email. Used for classification only, never output. */
  email: string;
  isMerge: boolean;
}

export interface ClaBotComment {
  createdAt: string;
  /** Committers listed with ✅ (only present when the PR has more than one committer). */
  signed: string[];
  /** Committers listed with ❌ (only present when the PR has more than one committer). */
  unsigned: string[];
}

export interface ClaDiagnosis {
  /** The PR author's own GitHub account hasn't signed. */
  authorUnsigned: boolean;
  /** Other linked GitHub accounts with commits in the PR that haven't signed. */
  otherUnsigned: Array<{ login: string; shas: string[] }>;
  /** Commits whose email GitHub can't link to any account. */
  unlinked: Array<{ sha: string; name: string; fakeNoreply: boolean }>;
}

/** The kinds of things that block the check. A reminder's marker records the kinds it named. */
export type BlockerKind = 'author' | 'unlinked' | 'co-author';
const BLOCKER_KINDS: readonly string[] = ['author', 'unlinked', 'co-author'];

/**
 * Why a reminder is sent:
 * - `first`: the PR has no active reminder
 * - `new-blocker`: a kind of blocker no active reminder named now blocks the check
 * - `missed-date`: the active reminder's close date passed long ago without a close
 */
export type ReminderReason = 'first' | 'new-blocker' | 'missed-date';

export type PlannedAction =
  | { type: 'too-early'; days: number }
  | { type: 'remind'; days: number; why: ReminderReason }
  | { type: 'wait'; days: number; closeOn: number }
  | { type: 'close'; days: number }
  | { type: 'reopened'; days: number };

/** Every comment this workflow posts starts with its marker. Markers are matched there only. */
export const hasMarker = (body: string | null | undefined, marker: string) =>
  (body ?? '').startsWith(marker);

/** `2026-11-30`, in UTC. */
export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * An active reminder: the PR is closed if the check is still pending on this (UTC) date. It
 * also records the kinds of blockers the reminder named, never a name, a SHA or an email.
 */
export const reminderMarker = (closeOn: Date, named: BlockerKind[]) =>
  `<!-- community-pr-cla: reminder close-on=${isoDay(closeOn.getTime())} named=${named
    .filter((k) => BLOCKER_KINDS.includes(k))
    .join(',')} -->`;

/** A reminder withdrawn on this (UTC) date because the check passed. It no longer closes the PR. */
export const resolvedMarker = (on: number) =>
  `<!-- community-pr-cla: reminder resolved=${isoDay(on)} -->`;

const REMINDER_MARKER_RE =
  /^<!-- community-pr-cla: reminder (close-on|resolved)=(\d{4}-\d{2}-\d{2})(?: named=([a-z,-]{0,40}))? -->/;

export interface ReminderMark {
  state: 'active' | 'resolved';
  /** The close date, or the day the reminder was resolved, as the start of that UTC day. */
  date: number;
  /** The kinds of blockers the reminder named. */
  named: BlockerKind[];
}

/** Reads a reminder's marker. Null when `body` doesn't start with one. */
export function parseReminderMarker(body: string | null | undefined): ReminderMark | null {
  const m = REMINDER_MARKER_RE.exec(body ?? '');
  const date = m ? Date.parse(`${m[2]}T00:00:00Z`) : NaN;
  if (!m || Number.isNaN(date)) return null;
  const named = (m[3] ?? '').split(',').filter((k) => BLOCKER_KINDS.includes(k));
  return {
    state: m[1] === 'close-on' ? 'active' : 'resolved',
    date,
    named: named as BlockerKind[],
  };
}

/** Turns an active reminder's body into a resolved one. The original text stays below a note. */
export function resolveReminderBody(body: string, now: number): string {
  const rest = body.replace(REMINDER_MARKER_RE, '').replace(/^\n/, '');
  return [
    resolvedMarker(now),
    '> ✅ **Update:** the CLA check has passed since this reminder, so it no longer applies. Thank you!',
    '',
    rest,
  ].join('\n');
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

export const shortSha = (sha: string) => sha.slice(0, 7);

export function isNoreplyEmail(email: string): boolean {
  return /@users\.noreply\.github\.com$/i.test(email.trim());
}

/**
 * Renders a git author name as an inline code span, or null when it is unsafe to show
 * (empty, or looks like an email address). Code spans keep names from turning into
 * mentions, links or markdown; `<` and `>` are dropped so a name can't carry an HTML comment.
 */
export function displayName(name: string): string | null {
  const clean = name.replace(/[`<>\r\n]/g, '').trim();
  if (!clean || clean.includes('@')) return null;
  return `\`${clean}\``;
}

/** Parses the CLA Assistant comment for its ✅ / ❌ committer list. */
export function parseClaBotComment(body: string, createdAt: string): ClaBotComment {
  const signed: string[] = [];
  const unsigned: string[] = [];
  // Git author names end up in this comment, so it is split and matched with plain string
  // checks: no pattern here can backtrack on a crafted name.
  for (const piece of body.split(/<br\s{0,5}\/?>|\n/)) {
    const entry = piece.trim();
    for (const [emoji, list] of [
      [':white_check_mark:', signed],
      [':x:', unsigned],
    ] as const) {
      if (!entry.startsWith(emoji)) continue;
      const name = entry.slice(emoji.length).trim();
      if (name && !name.includes('<')) list.push(name);
    }
  }
  return { createdAt, signed, unsigned };
}

export function diagnose(prAuthor: string, commits: CommitInfo[], bot: ClaBotComment | null) {
  const lc = (s: string) => s.toLowerCase();
  const nonMerge = commits.filter((c) => !c.isMerge);

  const unlinked = nonMerge
    .filter((c) => !c.login)
    .map((c) => ({ sha: c.sha, name: c.name, fakeNoreply: isNoreplyEmail(c.email) }));

  const shasByLogin = new Map<string, { login: string; shas: string[] }>();
  for (const c of nonMerge) {
    if (!c.login) continue;
    const entry = shasByLogin.get(lc(c.login)) ?? { login: c.login, shas: [] };
    entry.shas.push(c.sha);
    shasByLogin.set(lc(c.login), entry);
  }

  // With several committers the bot lists who signed (✅) and who hasn't (❌). Only the ❌
  // entries are trusted: anyone can author a commit with someone else's email, so a linked
  // login alone never gets named or mentioned.
  //
  // A ❌ entry is a login for a linked commit, but the git author name for an unlinked one, and
  // anyone can pick a git name that equals someone's login. So a ❌ name is dropped when the bot
  // also lists it under ✅, or when it is the git name of an unlinked commit: that entry is
  // about the unlinked commit, which the reminder already names.
  const hasList = !!bot && bot.signed.length + bot.unsigned.length > 0;
  const signedNames = new Set((bot?.signed ?? []).map(lc));
  const unlinkedNames = new Set(nonMerge.filter((c) => !c.login).map((c) => lc(c.name.trim())));
  const unsignedNames = new Set(
    (bot?.unsigned ?? []).map(lc).filter((n) => !signedNames.has(n) && !unlinkedNames.has(n))
  );

  // Without a list, the bot has a single committer to ask. That is the author when the
  // author's account is the only linked one and no commit is unlinked. With an unlinked commit,
  // that commit is likely the one the bot asks about (#26424: the author had signed, a commit
  // used a fake noreply email), so we can't tell, and don't claim the author hasn't signed.
  const authorUnsigned = hasList
    ? unsignedNames.has(lc(prAuthor))
    : !unlinked.length && shasByLogin.size === 1 && shasByLogin.has(lc(prAuthor));

  const otherUnsigned = hasList
    ? [...shasByLogin.keys()]
        .filter((l) => l !== lc(prAuthor) && unsignedNames.has(l))
        .map((l) => shasByLogin.get(l)!)
    : [];

  return { authorUnsigned, otherUnsigned, unlinked } satisfies ClaDiagnosis;
}

/** The kinds of blockers a diagnosis found, which is what a reminder about it names. */
export function kindsOf(d: ClaDiagnosis): BlockerKind[] {
  return [
    ...(d.authorUnsigned ? (['author'] as const) : []),
    ...(d.unlinked.length ? (['unlinked'] as const) : []),
    ...(d.otherUnsigned.length ? (['co-author'] as const) : []),
  ];
}

/**
 * Parses `CLA_ONLY_PRS` ("26424 #26864, 27513"). Returns undefined when it is empty, and
 * throws on anything that isn't a PR number, so a typo never widens the run to every PR.
 */
export function parseOnlyPRs(value: string | undefined): number[] | undefined {
  const tokens = (value ?? '').split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return undefined;
  return tokens.map((token) => {
    const match = /^#?(\d+)$/.exec(token);
    if (!match) throw new Error(`CLA_ONLY_PRS: "${token}" is not a PR number`);
    return Number(match[1]);
  });
}

export function planAction(opts: {
  /** When the check started pending: see `processPR`. */
  pendingSince: number;
  /** The close date the active reminder stated, or null when there is no active reminder. */
  closeOn: number | null;
  /** A kind of blocker that no active reminder named blocks the check now. */
  unnamed: boolean;
  /** This workflow's close notice is on the PR. */
  closed: boolean;
  now: number;
  reminderDays: number;
}): PlannedAction {
  const days = Math.floor((opts.now - opts.pendingSince) / DAY_MS);
  // Our close notice exists but the PR is open: someone reopened it on purpose. Leave it.
  if (opts.closed) return { type: 'reopened', days };
  if (opts.closeOn === null) {
    if (days < opts.reminderDays) return { type: 'too-early', days };
    return { type: 'remind', days, why: 'first' };
  }
  // The stated date is long past and the PR is still open, so something kept us from closing it
  // then (an exempt label, the PR was closed and reopened, the job was off). The author may no
  // longer expect a close: warn again instead.
  if (opts.now - opts.closeOn >= opts.reminderDays * DAY_MS) {
    return { type: 'remind', days, why: 'missed-date' };
  }
  // Never close on a blocker the author wasn't told about (say they signed, then a commit with
  // an unlinked email came in). Kinds, not commits, are compared, so a rebase sends nothing, and
  // with three kinds this can only move the date a couple of times.
  if (opts.unnamed) return { type: 'remind', days, why: 'new-blocker' };
  if (opts.now < opts.closeOn) return { type: 'wait', days, closeOn: opts.closeOn };
  return { type: 'close', days };
}

/**
 * The date a reminder sent now says the PR will be closed on. Each reminder gives the author
 * the same time to act: the gap between the two thresholds, and never less than the reminder
 * threshold. A reminder sent on day 7 closes on day 30.
 */
export function closeDate(opts: { now: number; reminderDays: number; closeDays: number }): Date {
  const grace = Math.max(opts.closeDays - opts.reminderDays, opts.reminderDays);
  return new Date(opts.now + grace * DAY_MS);
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const codeList = (shas: string[]) => shas.map((s) => `\`${shortSha(s)}\``).join(', ');

export interface RepoRef {
  owner: string;
  repo: string;
  /** The PR's base branch. */
  baseRef: string;
}

/**
 * Rewrites only the commits whose author (or committer) email is the one the contributor fills
 * in, between the PR base and HEAD. Other people's commits, author dates and merge commits
 * stay as they are.
 */
function reauthorSnippet(ref: RepoRef, exampleSha: string): string {
  return [
    `To see that email, run \`git log -1 --format=%ae ${exampleSha}\`. ` +
      'Fill in the placeholders below and run it on your PR branch. ' +
      'It only rewrites commits with that email and keeps their dates. ' +
      'If the commits use more than one email, run it once per email.',
    '',
    '```sh',
    `git fetch https://github.com/${ref.owner}/${ref.repo}.git ${ref.baseRef}`,
    "FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '",
    'OLD="<that email>"',
    'NEW_NAME="<your name>"',
    'NEW_EMAIL="<an email on your GitHub account>"',
    'if [ "$GIT_AUTHOR_EMAIL" = "$OLD" ]; then',
    '  export GIT_AUTHOR_NAME="$NEW_NAME" GIT_AUTHOR_EMAIL="$NEW_EMAIL"',
    'fi',
    'if [ "$GIT_COMMITTER_EMAIL" = "$OLD" ]; then',
    '  export GIT_COMMITTER_NAME="$NEW_NAME" GIT_COMMITTER_EMAIL="$NEW_EMAIL"',
    "fi' FETCH_HEAD..HEAD",
    'git push --force-with-lease',
    '```',
  ].join('\n');
}

function unlinkedSection(d: ClaDiagnosis, recheckUrl: string, ref: RepoRef): string {
  const one = d.unlinked.length === 1;
  const lines: string[] = [
    one
      ? "**A commit isn't linked to a GitHub account**"
      : "**Some commits aren't linked to a GitHub account**",
  ];
  lines.push('');
  lines.push(
    one
      ? "The CLA bot can't tell who signed for this commit, because its email isn't on any GitHub account:"
      : "The CLA bot can't tell who signed for these commits, because their email isn't on any GitHub account:"
  );
  lines.push('');

  const byName = new Map<string, string[]>();
  for (const c of d.unlinked) {
    const key = displayName(c.name) ?? '';
    byName.set(key, [...(byName.get(key) ?? []), c.sha]);
  }
  for (const [name, shas] of byName) {
    lines.push(`- ${name ? `${name}: ` : ''}${codeList(shas)}`);
  }
  lines.push('');

  const addable = d.unlinked.filter((c) => !c.fakeNoreply);
  const fake = d.unlinked.filter((c) => c.fakeNoreply);

  if (fake.length) {
    const which = fake.map((c) => `\`${shortSha(c.sha)}\``).join(', ');
    lines.push(
      `The email on ${
        fake.length === 1 ? 'commit' : 'commits'
      } ${which} looks like a GitHub noreply address, ` +
        "but it isn't the one GitHub assigned to an account, so it can't be added to one. " +
        'You can find your real noreply address in your [email settings](https://github.com/settings/emails).'
    );
    lines.push('');
  }

  if (addable.length) {
    const example = `\`${shortSha(addable[0].sha)}\``;
    lines.push('To fix it, either:');
    lines.push('');
    lines.push(
      `1. Add the email on commit ${example}${
        addable.length > 1 ? ' (and the others above)' : ''
      } ` +
        `to the GitHub account of whoever wrote it ([how](${ADD_EMAIL_DOCS})), make sure that account has signed the CLA, then click [recheck](${recheckUrl}).`
    );
    lines.push(
      `2. Or, if ${
        one ? 'that commit is' : 'those commits are'
      } yours and the email can't be added, ` +
        `re-author ${
          one ? 'it' : 'them'
        } with an email that's linked to your account, then force-push.`
    );
  } else {
    lines.push(
      `To fix it, re-author ${
        one ? 'that commit' : 'those commits'
      } with an email that's linked to your account, then force-push.`
    );
  }
  lines.push('');
  lines.push(reauthorSnippet(ref, shortSha(d.unlinked[0].sha)));
  return lines.join('\n');
}

export function buildReminderComment(opts: {
  login: string;
  diagnosis: ClaDiagnosis;
  claUrl: string;
  recheckUrl: string;
  closeOn: Date;
  repo: RepoRef;
  /** The PR already has an active reminder, with another close date. */
  replaces?: boolean;
}): string {
  const { login, diagnosis: d, claUrl, recheckUrl } = opts;
  const sections: string[] = [];

  if (d.authorUnsigned) {
    sections.push(
      // The check can also be stale (say an email was just added to the account), so this
      // doesn't claim the author never signed, and always offers the recheck.
      `**The CLA isn't signed for your account yet**\n\nPlease [sign it here](${claUrl}). If you already have, click [recheck](${recheckUrl}) to refresh the check.`
    );
  }

  if (d.unlinked.length) sections.push(unlinkedSection(d, recheckUrl, opts.repo));

  if (d.otherUnsigned.length) {
    sections.push(
      [
        "**Some co-authors haven't signed the CLA**",
        '',
        "Everyone who authored a commit in this PR needs to sign. These authors haven't yet:",
        '',
        // No `@`: a commit can carry someone else's email, and they shouldn't be notified.
        ...d.otherUnsigned.map((o) => `- \`${o.login}\`: ${codeList(o.shas)}`),
        '',
        `Each of them needs to [sign the CLA](${claUrl}). If they can't, drop their commits from this PR (for example with \`git rebase -i\`), then force-push.`,
      ].join('\n')
    );
  }

  if (!sections.length) {
    sections.push(
      `Please [sign the CLA](${claUrl}). If you already have, click [recheck](${recheckUrl}) to refresh the check.`
    );
  }

  // States no duration: the check may have passed in between, so "pending for N days" can be false.
  const intro = `Thank you for your contribution! The [Contributor License Agreement](${claUrl}) check on this PR is pending, and we can't merge it until it passes. Here's what's blocking it:`;

  const closing = opts.replaces
    ? 'This replaces our earlier reminder, and the date below is the new one. '
    : '';

  return [
    reminderMarker(opts.closeOn, kindsOf(d)),
    '> This is a templated message',
    '',
    `Hello @${login},`,
    '',
    intro,
    '',
    sections.join('\n\n'),
    '',
    `${closing}If the check is still pending on **${formatDate(
      opts.closeOn
    )}**, this PR will be closed. You can reopen it once the CLA is signed. 💜`,
  ].join('\n');
}

/** States no duration: the check may have passed in between, so "pending for N days" can be false. */
export function buildCloseComment(opts: { login: string; claUrl: string }): string {
  return [
    CLOSED_MARKER,
    '> This is a templated message',
    '',
    `Hello @${opts.login},`,
    '',
    `The [CLA](${opts.claUrl}) check on this PR is still pending after our reminder, so we are closing it for now.`,
    '',
    "Once the CLA is signed, feel free to reopen it (or open a new PR if you've force-pushed since). We'd love to get it merged! 💜",
  ].join('\n');
}

// ─── GitHub I/O ─────────────────────────────────────────────────────────────

interface OpenPR {
  number: number;
  login: string;
  isBot: boolean;
  association: string;
  createdAt: string;
  baseRef: string;
  labels: string[];
  cla: { state: string; targetUrl: string | null } | null;
}

interface OpenPRsQuery {
  repository: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        number: number;
        createdAt: string;
        baseRefName: string;
        authorAssociation: string;
        author: { login: string; __typename: string } | null;
        labels: { nodes: Array<{ name: string }> };
        commits: {
          nodes: Array<{
            commit: {
              status: { context: { state: string; targetUrl: string | null } | null } | null;
            };
          }>;
        };
      }>;
    };
  };
}

async function listOpenPRs(github: Octokit, owner: string, repo: string): Promise<OpenPR[]> {
  const out: OpenPR[] = [];
  let cursor: string | null = null;
  do {
    const res: OpenPRsQuery = await github.graphql(
      `query ($owner: String!, $repo: String!, $cursor: String, $context: String!) {
        repository(owner: $owner, name: $repo) {
          pullRequests(states: OPEN, first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number
              createdAt
              baseRefName
              authorAssociation
              author { login __typename }
              labels(first: 50) { nodes { name } }
              commits(last: 1) {
                nodes { commit { status { context(name: $context) { state targetUrl } } } }
              }
            }
          }
        }
      }`,
      { owner, repo, cursor, context: CLA_STATUS_CONTEXT }
    );
    const page = res.repository.pullRequests;
    for (const n of page.nodes) {
      out.push({
        number: n.number,
        login: n.author?.login ?? 'ghost',
        isBot: !n.author || n.author.__typename === 'Bot' || n.author.login.endsWith('[bot]'),
        association: n.authorAssociation,
        createdAt: n.createdAt,
        baseRef: n.baseRefName,
        labels: n.labels.nodes.map((l) => l.name),
        cla: n.commits.nodes[0]?.commit.status?.context ?? null,
      });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

/** GitHub lists at most this many commits of a PR, oldest first. */
export const MAX_PR_COMMITS = 250;

async function listCommits(github: Octokit, owner: string, repo: string, pull_number: number) {
  const commits = await github.paginate(github.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  });
  return commits.map((c): CommitInfo => ({
    sha: c.sha,
    login: c.author?.login ?? null,
    name: c.commit.author?.name ?? '',
    email: c.commit.author?.email ?? '',
    isMerge: c.parents.length > 1,
  }));
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// ─── Main entry ─────────────────────────────────────────────────────────────

export interface ProcessOptions {
  github: Octokit;
  owner: string;
  repo: string;
  dryRun: boolean;
  reminderDays: number;
  closeDays: number;
  exemptLabels: string[];
  /**
   * Restrict the run to these PR numbers (for testing against known cases). When set, only
   * these PRs are processed, so an empty list processes none.
   */
  only?: number[];
  now?: number;
  log: (message: string) => void;
  /** Called after a PR is closed, e.g. to sync Linear. */
  onClosed?: (prNumber: number) => Promise<void>;
}

export interface ProcessResult {
  pr: number;
  login: string;
  days: number;
  /**
   * `resolved`: the check passed, and the PR's active reminder was marked as resolved.
   * `skipped`: the PR has too many commits to diagnose.
   */
  action: PlannedAction['type'] | 'resolved' | 'skipped' | 'error';
  detail: string;
  /** Set when processing this PR failed. Later PRs are still processed. */
  error?: string;
}

export async function processUnsignedClaPRs(opts: ProcessOptions): Promise<ProcessResult[]> {
  const { github, owner, repo, dryRun, log } = opts;
  const now = opts.now ?? Date.now();
  const lc = (l: string) => l.toLowerCase();
  const exempt = new Set(opts.exemptLabels.map(lc));
  const lifecycle = new Set(LIFECYCLE_LABELS.map(lc));
  const results: ProcessResult[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';

  let prs = await listOpenPRs(github, owner, repo);
  if (opts.only) prs = prs.filter((p) => opts.only!.includes(p.number));
  log(`Found ${prs.length} open PRs`);

  for (const pr of prs) {
    if (pr.isBot) continue;
    if (INTERNAL_ASSOCIATIONS.has(pr.association)) continue;

    const result: ProcessResult = {
      pr: pr.number,
      login: pr.login,
      days: 0,
      action: 'error',
      detail: '',
    };
    const attempt = async (work: () => Promise<void>) => {
      try {
        await work();
      } catch (error) {
        result.action = 'error';
        result.error = errorMessage(error);
        log(`PR #${pr.number}: failed: ${result.error}`);
      }
    };

    if (pr.cla?.state === 'SUCCESS') {
      // The check passed: a reminder we sent no longer applies. Withdrawing it means a later
      // regression starts over with a new reminder, and is never closed on an old one.
      let resolved = false;
      await attempt(async () => {
        resolved = await resolveReminders({ ...opts, pr, now, result, prefix });
      });
      if (resolved || result.error) results.push(result);
      continue;
    }
    const isCommunity = pr.labels.some((l) => lc(l) === COMMUNITY_LABEL);
    const exemptLabel = pr.labels.find(
      (l) => exempt.has(lc(l)) || (isCommunity && lifecycle.has(lc(l)))
    );
    if (exemptLabel) {
      log(`PR #${pr.number}: skipped (label "${exemptLabel}")`);
      continue;
    }
    if (!pr.cla) {
      log(`PR #${pr.number}: skipped (no ${CLA_STATUS_CONTEXT} status yet)`);
      continue;
    }

    results.push(result);
    await attempt(() => processPR({ ...opts, pr, now, result, prefix }));
  }

  return results;
}

type PRContext = ProcessOptions & {
  pr: OpenPR;
  now: number;
  result: ProcessResult;
  prefix: string;
};

const listComments = (github: Octokit, owner: string, repo: string, issue_number: number) =>
  github.paginate(github.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 });

/** Marks the active reminders of a PR whose check passed as resolved. */
async function resolveReminders(opts: PRContext): Promise<boolean> {
  const { github, owner, repo, dryRun, log, pr, now, result, prefix } = opts;
  const comments = await listComments(github, owner, repo, pr.number);
  const active = comments.filter(
    (c) => c.user?.login === ACTIONS_BOT_LOGIN && parseReminderMarker(c.body)?.state === 'active'
  );
  if (!active.length) return false;

  result.action = 'resolved';
  log(`${prefix}PR #${pr.number} (@${pr.login}): check passed → reminder marked as resolved`);
  if (dryRun) return true;
  for (const c of active) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: c.id,
      body: resolveReminderBody(c.body ?? '', now),
    });
  }
  return true;
}

async function processPR(opts: PRContext): Promise<void> {
  const { github, owner, repo, dryRun, log, pr, now, result, prefix } = opts;
  const cla = pr.cla!;
  const at = (iso: string) => new Date(iso).getTime();

  const comments = await listComments(github, owner, repo, pr.number);
  const botComment = comments.find((c) => c.user?.login === CLA_BOT_LOGIN);

  // Only our own comments count, and only when the marker is the first thing in the body.
  const ours = comments.filter((c) => c.user?.login === ACTIONS_BOT_LOGIN);
  const marks = ours.flatMap((c) => {
    const mark = parseReminderMarker(c.body);
    return mark ? [{ ...mark, at: at(c.created_at) }] : [];
  });
  const active = marks.filter((m) => m.state === 'active').sort((a, b) => b.at - a.at);
  const resolvedOn = marks.filter((m) => m.state === 'resolved').map((m) => m.date);
  const closed = ours.some((c) => hasMarker(c.body, CLOSED_MARKER));

  // Pending since the CLA bot first asked, or since we last saw the check pass.
  const pendingSince = Math.max(at(botComment?.created_at ?? pr.createdAt), ...resolvedOn);
  const days = Math.floor((now - pendingSince) / DAY_MS);
  result.days = days;
  const who = `PR #${pr.number} (@${pr.login}): pending for ${days}d`;

  // The commits are needed to write a reminder, and to check that the active one named what
  // blocks the check now.
  let diagnosis: ClaDiagnosis | null = null;
  if (!closed && (active.length || days >= opts.reminderDays)) {
    const commits = await listCommits(github, owner, repo, pr.number);
    if (commits.length >= MAX_PR_COMMITS) {
      // GitHub lists no more than this, so the diagnosis could name the wrong cause.
      result.action = 'skipped';
      result.detail = `${MAX_PR_COMMITS}+ commits, GitHub doesn't list them all`;
      log(`${who} → skipped (${result.detail})`);
      return;
    }
    diagnosis = diagnose(
      pr.login,
      commits,
      botComment ? parseClaBotComment(botComment.body ?? '', botComment.created_at) : null
    );
  }

  const named = new Set(active.flatMap((m) => m.named));
  const plan = planAction({
    pendingSince,
    closeOn: active[0]?.date ?? null,
    unnamed: !!diagnosis && kindsOf(diagnosis).some((k) => !named.has(k)),
    closed,
    now,
    reminderDays: opts.reminderDays,
  });
  result.action = plan.type;

  const claUrl = cla.targetUrl ?? `https://cla.strapi.io/${owner}/${repo}?pullRequest=${pr.number}`;
  const recheckUrl = `https://cla.strapi.io/check/${owner}/${repo}?pullRequest=${pr.number}`;

  if (plan.type === 'remind' && diagnosis) {
    const why = { first: '', 'new-blocker': 'new blocker: ', 'missed-date': 'missed close date: ' };
    result.detail = `${why[plan.why]}${describe(diagnosis)}`;
    const body = buildReminderComment({
      login: pr.login,
      diagnosis,
      claUrl,
      recheckUrl,
      closeOn: closeDate({ now, reminderDays: opts.reminderDays, closeDays: opts.closeDays }),
      repo: { owner, repo, baseRef: pr.baseRef },
      replaces: plan.why !== 'first',
    });
    log(`${prefix}${who} → reminder [${result.detail}]`);
    if (dryRun) {
      log(body.replace(/^/gm, '    | '));
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
    }
  } else if (plan.type === 'close') {
    log(`${prefix}${who} → close`);
    if (dryRun) return;
    await closeWithNotice({ ...opts, claUrl });
  } else {
    result.detail = plan.type === 'wait' ? `closes on ${isoDay(plan.closeOn)}` : '';
    log(`${who} → ${plan.type}${result.detail ? ` (${result.detail})` : ''}`);
  }
}

/**
 * Closes the PR, then posts the close notice and runs `onClosed`. The close comes first: a
 * notice on a PR that failed to close would read as "reopened", and the PR would be left open
 * for good.
 *
 * If the notice can't be posted, the PR stays closed and the run reports it. The reminder
 * already told the author why and when. Without the notice, a later reopen isn't recognised as
 * one: the PR follows the usual rules again.
 */
async function closeWithNotice(opts: ProcessOptions & { pr: OpenPR; claUrl: string }) {
  const { github, owner, repo, pr } = opts;
  const body = buildCloseComment({ login: pr.login, claUrl: opts.claUrl });
  await github.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' });

  const problems: string[] = [];
  try {
    await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
  } catch (error) {
    problems.push(`the close notice could not be posted, post it by hand (${errorMessage(error)})`);
  }
  // A closed PR isn't seen by later runs, so this is the only chance to sync: try twice.
  try {
    await opts.onClosed?.(pr.number);
  } catch {
    try {
      await opts.onClosed?.(pr.number);
    } catch (error) {
      problems.push(errorMessage(error));
    }
  }
  if (problems.length) throw new Error(`closed, but: ${problems.join('; ')}`);
}
export function describe(d: ClaDiagnosis): string {
  const parts: string[] = [];
  if (d.authorUnsigned) parts.push('author unsigned');
  const fake = d.unlinked.filter((c) => c.fakeNoreply).length;
  if (d.unlinked.length) {
    parts.push(`${d.unlinked.length} unlinked commit(s)${fake ? `, ${fake} fake noreply` : ''}`);
  }
  if (d.otherUnsigned.length) {
    parts.push(`co-authors unsigned: ${d.otherUnsigned.map((o) => o.login).join(', ')}`);
  }
  return parts.join('; ') || 'unknown cause';
}

// ─── Linear ─────────────────────────────────────────────────────────────────

export interface LinearConfig {
  apiKey?: string;
  cprTeamId?: string;
  cmsTeamId?: string;
  /** The CMS team's Canceled state. Looked up when unset (and always for CPR). */
  cmsCanceledStateId?: string;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Calls the Linear API, and throws on an HTTP error, a GraphQL `errors` list or a missing
 * `data`, so a failed lookup is never read as "no ticket".
 */
export async function linearRequest<T>(
  apiKey: string,
  query: string,
  variables: Record<string, string>,
  fetchImpl: Fetch = fetch
): Promise<T> {
  const res = await fetchImpl('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  let json: { data?: T | null; errors?: Array<{ message?: string }> } | null = null;
  try {
    json = await res.json();
  } catch {
    // Reported below with the HTTP status.
  }
  const errors = (json?.errors ?? []).map((e) => e.message ?? 'unknown error');
  if (!res.ok || errors.length || !json?.data) {
    throw new Error(`Linear: ${errors.join('; ') || `HTTP ${res.status}, no data`}`);
  }
  return json.data;
}

/**
 * Cancels the PR's Linear ticket. New community tickets live in CPR, and only move to CMS once
 * picked up, so CPR is checked first. Each team's own Canceled state is used. Throws when
 * Linear can't be read or updated.
 */
export async function cancelLinearTicket(
  prNumber: number,
  config: LinearConfig,
  log: (message: string) => void,
  fetchImpl: Fetch = fetch
): Promise<void> {
  const { apiKey } = config;
  if (!apiKey) {
    log(`PR #${prNumber}: Linear not synced (LINEAR_API_KEY is not set)`);
    return;
  }
  const teams = [
    { name: 'CPR', id: config.cprTeamId, canceled: undefined },
    { name: 'CMS', id: config.cmsTeamId, canceled: config.cmsCanceledStateId },
  ];
  const missing = teams.filter((t) => !t.id).map((t) => t.name);
  if (missing.length) log(`PR #${prNumber}: Linear team id not set for ${missing.join(', ')}`);

  for (const team of teams) {
    if (!team.id) continue;
    const found = await linearRequest<{ issues: { nodes: Array<{ id: string; title: string }> } }>(
      apiKey,
      `query ($teamId: ID!, $title: String!) {
        issues(
          filter: { team: { id: { eq: $teamId } }, title: { startsWith: $title } }
          first: 1
        ) { nodes { id title } }
      }`,
      { teamId: team.id, title: `PR #${prNumber}:` },
      fetchImpl
    );
    const issue = found.issues.nodes[0];
    if (!issue) continue;

    let stateId = team.canceled;
    if (!stateId) {
      const states = await linearRequest<{ team: { states: { nodes: Array<{ id: string }> } } }>(
        apiKey,
        `query ($teamId: String!) {
          team(id: $teamId) { states(filter: { type: { eq: "canceled" } }) { nodes { id } } }
        }`,
        { teamId: team.id },
        fetchImpl
      );
      stateId = states.team.states.nodes[0]?.id;
    }
    if (!stateId) throw new Error(`Linear ${team.name}: no Canceled state found`);

    const updated = await linearRequest<{ issueUpdate: { success: boolean } }>(
      apiKey,
      `mutation ($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) { success }
      }`,
      { id: issue.id, stateId },
      fetchImpl
    );
    if (!updated.issueUpdate.success) {
      throw new Error(`Linear ${team.name}: could not cancel ${issue.title}`);
    }
    log(`PR #${prNumber}: Linear ${team.name} → "Canceled"`);
    return;
  }
  log(`PR #${prNumber}: no Linear ticket found`);
}
