/**
 * Follows up on community PRs whose CLA (CLA Assistant, `license/cla` status) is still unsigned.
 *
 *   unsigned ≥ CLA_REMINDER_DAYS → one reminder comment that says exactly what blocks the check
 *   new blockers after that      → at most one follow-up reminder
 *   unsigned ≥ CLA_CLOSE_DAYS    → close the PR (once the latest reminder is CLA_REMINDER_DAYS old)
 *   latest reminder is stale     → one final reminder first (once the latest reminder is
 *                                  CLA_CLOSE_DAYS old), then the close waits for it too
 *
 * The clock starts at the CLA bot's first comment. Commit emails are never written to comments
 * or logs: commits are referred to by SHA.
 */

import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export const CLA_STATUS_CONTEXT = 'license/cla';
export const CLA_BOT_LOGIN = 'strapi-cla';
export const ACTIONS_BOT_LOGIN = 'github-actions[bot]';
export const CLOSED_MARKER = '<!-- community-pr-cla: closed -->';

/**
 * A PR gets its first reminder, and at most one follow-up when something new blocks the check.
 * A final reminder, sent at most once when the latest warning is stale, doesn't count.
 */
export const MAX_REMINDERS = 2;

/** The blocker token for "the PR author hasn't signed". Every other blocker is a commit SHA. */
export const AUTHOR_BLOCKER = 'author';

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

/** A reminder this workflow posted, and the blockers its marker says it named. */
export interface SentReminder {
  at: number;
  blockers: string[];
  /** The one reminder sent because the latest warning was stale (outside MAX_REMINDERS). */
  final: boolean;
}

/**
 * - `first`: the first reminder
 * - `follow-up`: something the latest reminder didn't name blocks the check now
 * - `final`: the latest reminder is older than the close threshold, so its warning is stale
 */
export type ReminderKind = 'first' | 'follow-up' | 'final';

export type PlannedAction =
  | { type: 'too-early'; days: number }
  | { type: 'remind'; days: number; kind: ReminderKind }
  | { type: 'wait'; days: number; reason: string }
  | { type: 'close'; days: number }
  | { type: 'reopened'; days: number };

/** Every comment this workflow posts starts with its marker. Markers are matched there only. */
export const hasMarker = (body: string | null | undefined, marker: string) =>
  (body ?? '').startsWith(marker);

const BLOCKER_RE = /^(author|[0-9a-f]{7,40})$/;

/**
 * The reminder marker records what the reminder named: `author` and commit SHAs only, never a
 * name or an email.
 */
export function reminderMarker(blockers: string[], final = false): string {
  const safe = blockers.filter((b) => BLOCKER_RE.test(b));
  return `<!-- community-pr-cla: reminder${final ? ' final' : ''} blockers=${safe.join(',')} -->`;
}

const REMINDER_MARKER_RE = /^<!-- community-pr-cla: reminder( final)? blockers=([0-9a-z,]*) -->/;

/** The blockers a reminder named, or null when `body` doesn't start with a reminder marker. */
export function parseReminderMarker(body: string | null | undefined): string[] | null {
  const m = REMINDER_MARKER_RE.exec(body ?? '');
  if (!m) return null;
  return m[2].split(',').filter((b) => BLOCKER_RE.test(b));
}

/** Whether `body` starts with the marker of a final reminder. */
export const isFinalReminder = (body: string | null | undefined) =>
  REMINDER_MARKER_RE.exec(body ?? '')?.[1] === ' final';

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
  const re = /:(white_check_mark|x):\s*([^<\n]+?)\s*(?=<br\s*\/?>|\n|$)/g;
  for (const m of body.matchAll(re)) {
    (m[1] === 'x' ? unsigned : signed).push(m[2].trim());
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
  const hasList = !!bot && bot.signed.length + bot.unsigned.length > 0;
  const unsignedNames = new Set((bot?.unsigned ?? []).map(lc));

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

/** What blocks the check: `author`, plus the SHAs of unlinked and unsigned co-author commits. */
export function blockersOf(d: ClaDiagnosis): string[] {
  const shas = [...d.unlinked.map((c) => c.sha), ...d.otherUnsigned.flatMap((o) => o.shas)];
  return [...new Set([...(d.authorUnsigned ? [AUTHOR_BLOCKER] : []), ...shas])];
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
  /** The CLA bot's first comment (or the PR's creation, when there is none). */
  unsignedSince: number;
  /** Reminders this workflow posted on the PR. */
  reminders: SentReminder[];
  /** What blocks the check now (see `blockersOf`). */
  blockers: string[];
  /** When this workflow posted its close notice, if it did. */
  closedNoticeAt: number | null;
  now: number;
  reminderDays: number;
  closeDays: number;
}): PlannedAction {
  const days = Math.floor((opts.now - opts.unsignedSince) / DAY_MS);
  // Our close notice exists but the PR is open: someone reopened it on purpose. Leave it.
  if (opts.closedNoticeAt) return { type: 'reopened', days };
  if (days < opts.reminderDays) return { type: 'too-early', days };
  const latest = [...opts.reminders].sort((a, b) => b.at - a.at)[0];
  if (!latest) return { type: 'remind', days, kind: 'first' };
  // Something the latest reminder didn't name blocks the check now (say the author signed, then
  // a commit with an unlinked email came in): tell the author, once. A force-push that keeps
  // the same blockers, or fewer, changes nothing.
  const named = new Set(latest.blockers);
  const fresh = opts.blockers.filter((b) => !named.has(b));
  const regular = opts.reminders.filter((r) => !r.final).length;
  if (fresh.length && regular < MAX_REMINDERS) {
    return { type: 'remind', days, kind: 'follow-up' };
  }
  if (days < opts.closeDays) return { type: 'wait', days, reason: 'reminder sent' };
  const sinceReminder = Math.floor((opts.now - latest.at) / DAY_MS);
  // The latest warning is older than a whole close period (say the check was green for months
  // and went pending again): warn once more before closing, so the close is never a surprise.
  if (sinceReminder >= opts.closeDays && !opts.reminders.some((r) => r.final)) {
    return { type: 'remind', days, kind: 'final' };
  }
  if (sinceReminder < opts.reminderDays) {
    return { type: 'wait', days, reason: `reminder is only ${sinceReminder}d old` };
  }
  return { type: 'close', days };
}

/** The date we tell the author the PR will be closed on (never sooner than the reminder grace). */
export function closeDate(opts: {
  unsignedSince: number;
  now: number;
  reminderDays: number;
  closeDays: number;
}): Date {
  return new Date(
    Math.max(opts.unsignedSince + opts.closeDays * DAY_MS, opts.now + opts.reminderDays * DAY_MS)
  );
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
  days: number;
  closeOn: Date;
  repo: RepoRef;
  /** Which reminder this is (see `ReminderKind`). Defaults to the first. */
  kind?: ReminderKind;
}): string {
  const { login, diagnosis: d, claUrl, recheckUrl } = opts;
  const sections: string[] = [];

  if (d.authorUnsigned) {
    sections.push(
      `**You haven't signed the CLA yet**\n\nPlease [sign it here](${claUrl}). The check updates on its own once you have.`
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
        ...d.otherUnsigned.map((o) => `- @${o.login}: ${codeList(o.shas)}`),
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

  const cla = `[Contributor License Agreement](${claUrl})`;
  const intro = {
    first: `Thank you for your contribution! The ${cla} check on this PR has been pending for **${opts.days} days**, and we can't merge it until it passes. Here's what's blocking it:`,
    'follow-up': `The ${cla} check on this PR is still pending, and something new is blocking it since our last reminder. Here's what's blocking it now:`,
    final: `The ${cla} check on this PR is pending, and we can't merge it until it passes. Here's what's blocking it:`,
  }[opts.kind ?? 'first'];

  return [
    reminderMarker(blockersOf(d), opts.kind === 'final'),
    '> This is a templated message',
    '',
    `Hello @${login},`,
    '',
    intro,
    '',
    sections.join('\n\n'),
    '',
    `If the check is still pending on **${formatDate(
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
  action: PlannedAction['type'] | 'error';
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
    if (pr.cla?.state === 'SUCCESS') continue;
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

    const result: ProcessResult = {
      pr: pr.number,
      login: pr.login,
      days: 0,
      action: 'error',
      detail: '',
    };
    results.push(result);

    try {
      await processPR({ ...opts, pr, now, result, prefix });
    } catch (error) {
      result.action = 'error';
      result.error = errorMessage(error);
      log(`PR #${pr.number}: failed: ${result.error}`);
    }
  }

  return results;
}

async function processPR(
  opts: ProcessOptions & { pr: OpenPR; now: number; result: ProcessResult; prefix: string }
): Promise<void> {
  const { github, owner, repo, dryRun, log, pr, now, result, prefix } = opts;
  const cla = pr.cla!;
  const at = (iso: string) => new Date(iso).getTime();

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  });
  const botComment = comments.find((c) => c.user?.login === CLA_BOT_LOGIN);
  const unsignedSince = at(botComment?.created_at ?? pr.createdAt);

  // Only our own comments count, and only when the marker is the first thing in the body.
  const ours = comments.filter((c) => c.user?.login === ACTIONS_BOT_LOGIN);
  const reminders = ours.flatMap((c): SentReminder[] => {
    const blockers = parseReminderMarker(c.body);
    return blockers ? [{ at: at(c.created_at), blockers, final: isFinalReminder(c.body) }] : [];
  });
  const closedNotice = ours.find((c) => hasMarker(c.body, CLOSED_MARKER));

  // The commits only matter once a reminder is due: to write it, or to see whether something
  // new blocks the check since the last one.
  const days = Math.floor((now - unsignedSince) / DAY_MS);
  let diagnosis: ClaDiagnosis | null = null;
  if (!closedNotice && days >= opts.reminderDays) {
    diagnosis = diagnose(
      pr.login,
      await listCommits(github, owner, repo, pr.number),
      botComment ? parseClaBotComment(botComment.body ?? '', botComment.created_at) : null
    );
  }

  const plan = planAction({
    unsignedSince,
    reminders,
    blockers: diagnosis ? blockersOf(diagnosis) : [],
    closedNoticeAt: closedNotice ? at(closedNotice.created_at) : null,
    now,
    reminderDays: opts.reminderDays,
    closeDays: opts.closeDays,
  });
  result.days = plan.days;
  result.action = plan.type;

  const claUrl = cla.targetUrl ?? `https://cla.strapi.io/${owner}/${repo}?pullRequest=${pr.number}`;
  const recheckUrl = `https://cla.strapi.io/check/${owner}/${repo}?pullRequest=${pr.number}`;

  if (plan.type === 'remind' && diagnosis) {
    const label = { first: '', 'follow-up': 'new blockers: ', final: 'stale warning: ' };
    result.detail = `${label[plan.kind]}${describe(diagnosis)}`;
    const body = buildReminderComment({
      login: pr.login,
      diagnosis,
      claUrl,
      recheckUrl,
      days: plan.days,
      closeOn: closeDate({
        unsignedSince,
        now,
        reminderDays: opts.reminderDays,
        closeDays: opts.closeDays,
      }),
      repo: { owner, repo, baseRef: pr.baseRef },
      kind: plan.kind,
    });
    log(
      `${prefix}PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → ${
        plan.kind === 'first' ? '' : `${plan.kind} `
      }reminder [${result.detail}]`
    );
    if (dryRun) {
      log(body.replace(/^/gm, '    | '));
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
    }
  } else if (plan.type === 'close') {
    log(`${prefix}PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → close`);
    if (dryRun) return;
    await closeWithNotice({ ...opts, claUrl });
  } else {
    result.detail = plan.type === 'wait' ? plan.reason : '';
    log(
      `PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → ${plan.type}${
        result.detail ? ` (${result.detail})` : ''
      }`
    );
  }
}

/**
 * Closes the PR, then posts the close notice. A PR this workflow closed always carries the
 * notice, because the notice is how a deliberate reopen is recognised: if posting fails twice,
 * the PR is reopened so the next run closes it again. Only if that reopen also fails can a
 * closed PR lack the notice, and the error says so.
 *
 * GitHub can store a comment and still answer with an error, so before retrying, and before
 * reopening, the comments are read again: a stored notice means the close is done. Without
 * that, a reopen under a stored notice would leave the PR "reopened" for good.
 */
async function closeWithNotice(
  opts: ProcessOptions & { pr: OpenPR; claUrl: string }
): Promise<void> {
  const { github, owner, repo, pr } = opts;
  const body = buildCloseComment({ login: pr.login, claUrl: opts.claUrl });
  const postNotice = () =>
    github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
  const noticeStored = async () => {
    try {
      const comments = await github.paginate(github.rest.issues.listComments, {
        owner,
        repo,
        issue_number: pr.number,
        per_page: 100,
      });
      return comments.some(
        (c) => c.user?.login === ACTIONS_BOT_LOGIN && hasMarker(c.body, CLOSED_MARKER)
      );
    } catch {
      return false;
    }
  };

  /** Posts the notice; returns the error if it failed and the notice isn't stored after all. */
  const tryNotice = async (): Promise<unknown> => {
    try {
      await postNotice();
      return null;
    } catch (error) {
      return (await noticeStored()) ? null : error;
    }
  };

  await github.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' });
  const failed = (await tryNotice()) && (await tryNotice());
  if (failed) {
    const noticeError = errorMessage(failed);
    try {
      await github.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'open' });
    } catch (reopenError) {
      throw new Error(
        `closed WITHOUT a close notice (notice failed twice: ${noticeError}; reopen failed: ${errorMessage(
          reopenError
        )}). Post the notice by hand, or the PR is closed again if someone reopens it`
      );
    }
    throw new Error(
      `close notice failed twice (${noticeError}), so the PR was reopened; the next run closes it again`
    );
  }

  try {
    await opts.onClosed?.(pr.number);
  } catch (error) {
    throw new Error(`closed, but after close: ${errorMessage(error)}`);
  }
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
