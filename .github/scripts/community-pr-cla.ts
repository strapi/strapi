/**
 * Follows up on community PRs whose CLA (CLA Assistant, `license/cla` status) is still unsigned.
 *
 *   unsigned ≥ CLA_REMINDER_DAYS → one reminder comment that says exactly what blocks the check
 *   unsigned ≥ CLA_CLOSE_DAYS    → close the PR (only once the reminder is CLA_REMINDER_DAYS old)
 *
 * Commit emails are never written to comments or logs: commits are referred to by short SHA.
 */

import type { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

export const CLA_STATUS_CONTEXT = 'license/cla';
export const CLA_BOT_LOGIN = 'strapi-cla';
export const ACTIONS_BOT_LOGIN = 'github-actions[bot]';

/** REST reports the Actions bot as `github-actions[bot]`, GraphQL as `github-actions`. */
export const isActionsBot = (login: string | null | undefined) =>
  !!login && login.replace(/\[bot\]$/, '') === ACTIONS_BOT_LOGIN.replace(/\[bot\]$/, '');
export const REMINDER_MARKER = '<!-- community-pr-cla: reminder -->';
export const CLOSED_MARKER = '<!-- community-pr-cla: closed -->';

/** Associations that mean the author is part of the org (or has write access). */
const INTERNAL_ASSOCIATIONS = new Set(['MEMBER', 'OWNER', 'COLLABORATOR']);

/**
 * PRs in the community-pr-lifecycle flow are left to it: a maintainer is already following up
 * by hand, and that flow decides when the PR is closed. Adding `waiting on author` is also how a
 * maintainer opts a PR out of the CLA reminder.
 */
export const LIFECYCLE_LABELS = ['waiting on author', 'stale'];

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

/** A `license/cla` status of a commit that is (or was) in the PR. */
export interface ClaStatus {
  state: string;
  createdAt: string;
}

export type PlannedAction =
  | { type: 'too-early'; days: number }
  | { type: 'remind'; days: number }
  | { type: 'wait'; days: number; reason: string }
  | { type: 'close'; days: number }
  | { type: 'reopened'; days: number };

/** Every comment this workflow posts starts with its marker. Markers are matched there only. */
export const hasMarker = (body: string | null | undefined, marker: string) =>
  (body ?? '').startsWith(marker);

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
  // author's account is the only linked one; otherwise we can't tell, and name no one.
  const authorUnsigned = hasList
    ? unsignedNames.has(lc(prAuthor))
    : shasByLogin.size === 1 && shasByLogin.has(lc(prAuthor));

  const otherUnsigned = hasList
    ? [...shasByLogin.keys()]
        .filter((l) => l !== lc(prAuthor) && unsignedNames.has(l))
        .map((l) => shasByLogin.get(l)!)
    : [];

  return { authorUnsigned, otherUnsigned, unlinked } satisfies ClaDiagnosis;
}

/**
 * When the current pending period started: the CLA bot's first comment, unless the check has
 * passed on a commit since. Then the period restarts when the check went pending again, and
 * reminders or close notices from before that no longer count.
 *
 * `statuses` should include the head commit's whole status history (CLA Assistant can set a
 * passing commit back to pending) and the heads that force-pushes removed from the PR.
 */
export function pendingSince(opts: {
  botCommentAt: string | null;
  prCreatedAt: string;
  statuses: ClaStatus[];
}): number {
  const first = new Date(opts.botCommentAt ?? opts.prCreatedAt).getTime();
  const at = (s: ClaStatus) => new Date(s.createdAt).getTime();
  const successes = opts.statuses.filter((s) => s.state === 'SUCCESS').map(at);
  if (!successes.length) return first;
  const lastSuccess = Math.max(...successes);
  const pendingAfter = opts.statuses
    .filter((s) => s.state !== 'SUCCESS')
    .map(at)
    .filter((t) => t > lastSuccess);
  return pendingAfter.length ? Math.min(...pendingAfter) : lastSuccess;
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
  unsignedSince: number;
  reminderAt: number | null;
  /** When this workflow closed the PR (close event or close notice) in the current period. */
  closedAt: number | null;
  now: number;
  reminderDays: number;
  closeDays: number;
}): PlannedAction {
  const days = Math.floor((opts.now - opts.unsignedSince) / DAY_MS);
  // We closed the PR in this period but it is open: someone reopened it on purpose. Leave it.
  if (opts.closedAt) return { type: 'reopened', days };
  if (days < opts.reminderDays) return { type: 'too-early', days };
  if (!opts.reminderAt) return { type: 'remind', days };
  if (days < opts.closeDays) return { type: 'wait', days, reason: 'reminder sent' };
  const sinceReminder = Math.floor((opts.now - opts.reminderAt) / DAY_MS);
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

  return [
    REMINDER_MARKER,
    '> This is a templated message',
    '',
    `Hello @${login},`,
    '',
    `Thank you for your contribution! The [Contributor License Agreement](${claUrl}) check on this PR has been pending for **${opts.days} days**, and we can't merge it until it passes. Here's what's blocking it:`,
    '',
    sections.join('\n\n'),
    '',
    `If the check is still pending on **${formatDate(
      opts.closeOn
    )}**, this PR will be closed. You can reopen it once the CLA is signed. 💜`,
  ].join('\n');
}

export function buildCloseComment(opts: {
  login: string;
  claUrl: string;
  closeDays: number;
}): string {
  return [
    CLOSED_MARKER,
    '> This is a templated message',
    '',
    `Hello @${opts.login},`,
    '',
    `The [CLA](${opts.claUrl}) check on this PR has been pending for more than **${opts.closeDays} days**, so we are closing it for now.`,
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
  headSha: string | null;
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
              oid: string;
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
                nodes { commit { oid status { context(name: $context) { state targetUrl } } } }
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
        headSha: n.commits.nodes[0]?.commit.oid ?? null,
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
  return commits.map(
    (c): CommitInfo => ({
      sha: c.sha,
      login: c.author?.login ?? null,
      name: c.commit.author?.name ?? '',
      email: c.commit.author?.email ?? '',
      isMerge: c.parents.length > 1,
    })
  );
}

type StatusContext = { context: ClaStatus | null } | null;

interface PRHistoryQuery {
  repository: {
    pullRequest: {
      commits: { nodes: Array<{ commit: { status: StatusContext } }> };
      timelineItems: {
        nodes: Array<
          | {
              __typename: 'HeadRefForcePushedEvent';
              createdAt: string;
              beforeCommit: { status: StatusContext } | null;
            }
          | { __typename: 'ClosedEvent'; createdAt: string; actor: { login: string } | null }
        >;
      };
    } | null;
  };
}

interface PRHistory {
  /**
   * `license/cla` statuses: the latest one of each of the PR's last 100 commits, the latest one
   * of each head a force-push replaced, and the head commit's full history.
   */
  statuses: ClaStatus[];
  /** Force-pushes to the PR branch. */
  forcePushedAt: number[];
  /** Times this workflow (the Actions bot) closed the PR. */
  closedByUsAt: number[];
}

async function headClaStatuses(
  github: Octokit,
  owner: string,
  repo: string,
  headSha: string | null
): Promise<ClaStatus[]> {
  if (!headSha) return [];
  // GraphQL only has the latest status per commit: a SUCCESS that was later set back to pending
  // on the same commit only shows up in this list (newest first).
  const { data } = await github.rest.repos.listCommitStatusesForRef({
    owner,
    repo,
    ref: headSha,
    per_page: 100,
  });
  return data
    .filter((s) => s.context === CLA_STATUS_CONTEXT)
    .map((s) => ({ state: s.state.toUpperCase(), createdAt: s.created_at }));
}

async function loadPRHistory(
  github: Octokit,
  owner: string,
  repo: string,
  number: number,
  headSha: string | null
): Promise<PRHistory> {
  const [res, headStatuses] = await Promise.all([
    github.graphql<PRHistoryQuery>(
      `query ($owner: String!, $repo: String!, $number: Int!, $context: String!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            commits(last: 100) {
              nodes { commit { status { context(name: $context) { state createdAt } } } }
            }
            timelineItems(last: 100, itemTypes: [HEAD_REF_FORCE_PUSHED_EVENT, CLOSED_EVENT]) {
              nodes {
                __typename
                ... on HeadRefForcePushedEvent {
                  createdAt
                  beforeCommit { status { context(name: $context) { state createdAt } } }
                }
                ... on ClosedEvent { createdAt actor { login } }
              }
            }
          }
        }
      }`,
      { owner, repo, number, context: CLA_STATUS_CONTEXT }
    ),
    headClaStatuses(github, owner, repo, headSha),
  ]);

  const pr = res.repository.pullRequest;
  const history: PRHistory = { statuses: headStatuses, forcePushedAt: [], closedByUsAt: [] };
  for (const n of pr?.commits.nodes ?? []) {
    if (n.commit.status?.context) history.statuses.push(n.commit.status.context);
  }
  for (const item of pr?.timelineItems.nodes ?? []) {
    if (item.__typename === 'HeadRefForcePushedEvent') {
      history.forcePushedAt.push(new Date(item.createdAt).getTime());
      const before = item.beforeCommit?.status?.context;
      if (before) history.statuses.push(before);
    } else if (item.__typename === 'ClosedEvent' && isActionsBot(item.actor?.login)) {
      history.closedByUsAt.push(new Date(item.createdAt).getTime());
    }
  }
  return history;
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
  const exempt = new Set([...opts.exemptLabels, ...LIFECYCLE_LABELS].map((l) => l.toLowerCase()));
  const results: ProcessResult[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';

  let prs = await listOpenPRs(github, owner, repo);
  if (opts.only) prs = prs.filter((p) => opts.only!.includes(p.number));
  log(`Found ${prs.length} open PRs`);

  for (const pr of prs) {
    if (pr.isBot) continue;
    if (INTERNAL_ASSOCIATIONS.has(pr.association)) continue;
    if (pr.cla?.state === 'SUCCESS') continue;
    const exemptLabel = pr.labels.find((l) => exempt.has(l.toLowerCase()));
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

  const [comments, history] = await Promise.all([
    github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: pr.number,
      per_page: 100,
    }),
    loadPRHistory(github, owner, repo, pr.number, pr.headSha),
  ]);
  const botComment = comments.find((c) => c.user?.login === CLA_BOT_LOGIN);
  const unsignedSince = pendingSince({
    botCommentAt: botComment?.created_at ?? null,
    prCreatedAt: pr.createdAt,
    statuses: history.statuses,
  });
  const at = (iso: string) => new Date(iso).getTime();

  // Only our comments from the current pending period count: if the check passed and went
  // pending again since, the PR gets a fresh reminder and a fresh close date.
  const ours = comments.filter(
    (c) => isActionsBot(c.user?.login) && at(c.created_at) >= unsignedSince
  );
  // A force-push can drop the commit the check passed on, or change what blocks it, so a
  // reminder from before the last force-push no longer counts: the PR gets a new one first.
  const lastForcePush = Math.max(-Infinity, ...history.forcePushedAt);
  const reminder = ours.find(
    (c) => hasMarker(c.body, REMINDER_MARKER) && at(c.created_at) > lastForcePush
  );
  const closedNotice = ours.find((c) => hasMarker(c.body, CLOSED_MARKER));
  // Our close event counts too, so a reopen is respected even when the close notice failed.
  const closedTimes = [
    ...(closedNotice ? [at(closedNotice.created_at)] : []),
    ...history.closedByUsAt.filter((t) => t >= unsignedSince),
  ];

  const plan = planAction({
    unsignedSince,
    reminderAt: reminder ? at(reminder.created_at) : null,
    closedAt: closedTimes.length ? Math.max(...closedTimes) : null,
    now,
    reminderDays: opts.reminderDays,
    closeDays: opts.closeDays,
  });
  result.days = plan.days;
  result.action = plan.type;

  const claUrl = cla.targetUrl ?? `https://cla.strapi.io/${owner}/${repo}?pullRequest=${pr.number}`;
  const recheckUrl = `https://cla.strapi.io/check/${owner}/${repo}?pullRequest=${pr.number}`;

  if (plan.type === 'remind') {
    const commits = await listCommits(github, owner, repo, pr.number);
    const diagnosis = diagnose(
      pr.login,
      commits,
      botComment ? parseClaBotComment(botComment.body ?? '', botComment.created_at) : null
    );
    result.detail = describe(diagnosis);
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
    });
    log(
      `${prefix}PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → reminder [${result.detail}]`
    );
    if (dryRun) {
      log(body.replace(/^/gm, '    | '));
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
    }
  } else if (plan.type === 'close') {
    log(`${prefix}PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → close`);
    if (dryRun) return;
    // Close first: if posting the comment fails, the PR is still closed, and an open PR never
    // carries a close notice that wasn't followed by a close. If only the notice fails, a later
    // reopen is still recognised from our close event in the timeline.
    await github.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' });
    const failures: string[] = [];
    try {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: pr.number,
        body: buildCloseComment({ login: pr.login, claUrl, closeDays: opts.closeDays }),
      });
    } catch (error) {
      failures.push(`close comment: ${errorMessage(error)}`);
    }
    try {
      await opts.onClosed?.(pr.number);
    } catch (error) {
      failures.push(`after close: ${errorMessage(error)}`);
    }
    if (failures.length) throw new Error(`closed, but ${failures.join('; ')}`);
  } else {
    result.detail = plan.type === 'wait' ? plan.reason : '';
    log(
      `PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → ${plan.type}${
        result.detail ? ` (${result.detail})` : ''
      }`
    );
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
