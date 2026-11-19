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
export const REMINDER_MARKER = '<!-- community-pr-cla: reminder -->';
export const CLOSED_MARKER = '<!-- community-pr-cla: closed -->';

/** Associations that mean the author is part of the org (or has write access). */
const INTERNAL_ASSOCIATIONS = new Set(['MEMBER', 'OWNER', 'COLLABORATOR']);

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
  /** Number of non-merge commits, used to build the rebase command. */
  commitCount: number;
  hasMergeCommits: boolean;
}

export type PlannedAction =
  | { type: 'too-early'; days: number }
  | { type: 'remind'; days: number }
  | { type: 'wait'; days: number; reason: string }
  | { type: 'close'; days: number }
  | { type: 'reopened'; days: number };

// ─── Pure helpers ───────────────────────────────────────────────────────────

export const shortSha = (sha: string) => sha.slice(0, 7);

export function isNoreplyEmail(email: string): boolean {
  return /@users\.noreply\.github\.com$/i.test(email.trim());
}

/**
 * Renders a git author name as an inline code span, or null when it is unsafe to show
 * (empty, or looks like an email address). Code spans keep names from turning into
 * mentions, links or markdown.
 */
export function displayName(name: string): string | null {
  const clean = name.replace(/[`\r\n]/g, '').trim();
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

  // With several committers the bot lists who signed. With one, there is no list and the
  // pending status means that one committer hasn't signed.
  const hasList = !!bot && bot.signed.length + bot.unsigned.length > 0;
  const unsignedNames = new Set((bot?.unsigned ?? []).map(lc));
  const unsignedLogins = [...shasByLogin.keys()].filter((l) =>
    hasList ? unsignedNames.has(l) : true
  );

  // The PR author counts as unsigned when their account has unsigned commits here, or when
  // they have no commits at all but the bot still lists them as unsigned.
  const authorUnsigned =
    unsignedLogins.includes(lc(prAuthor)) || (hasList && unsignedNames.has(lc(prAuthor)));

  const otherUnsigned = unsignedLogins
    .filter((l) => l !== lc(prAuthor))
    .map((l) => shasByLogin.get(l)!);

  return {
    authorUnsigned,
    otherUnsigned,
    unlinked,
    commitCount: nonMerge.length,
    hasMergeCommits: commits.some((c) => c.isMerge),
  } satisfies ClaDiagnosis;
}

export function planAction(opts: {
  unsignedSince: number;
  reminderAt: number | null;
  closedNoticeAt: number | null;
  now: number;
  reminderDays: number;
  closeDays: number;
}): PlannedAction {
  const days = Math.floor((opts.now - opts.unsignedSince) / DAY_MS);
  // Our close comment exists but the PR is open: someone reopened it on purpose. Leave it.
  if (opts.closedNoticeAt) return { type: 'reopened', days };
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

function rebaseSnippet(d: ClaDiagnosis): string {
  const base = d.hasMergeCommits ? '<commit-before-your-first-change>' : `HEAD~${d.commitCount}`;
  return [
    '```sh',
    'git config user.email "<an email on your GitHub account>"',
    `git rebase --exec "git commit --amend --no-edit --reset-author" ${base}`,
    'git push --force-with-lease',
    '```',
  ].join('\n');
}

function unlinkedSection(d: ClaDiagnosis, recheckUrl: string): string {
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
      `2. Or, if the email can't be added, remove ${
        one ? 'that commit' : 'those commits'
      } or re-author ${
        one ? 'it' : 'them'
      } with an email that's linked to your account, then force-push. For example:`
    );
  } else {
    lines.push(
      `To fix it, re-author ${
        one ? 'that commit' : 'those commits'
      } with an email that's linked to your account, then force-push. For example:`
    );
  }
  lines.push('');
  lines.push(rebaseSnippet(d));
  return lines.join('\n');
}

export function buildReminderComment(opts: {
  login: string;
  diagnosis: ClaDiagnosis;
  claUrl: string;
  recheckUrl: string;
  days: number;
  closeOn: Date;
}): string {
  const { login, diagnosis: d, claUrl, recheckUrl } = opts;
  const sections: string[] = [];

  if (d.authorUnsigned) {
    sections.push(
      `**You haven't signed the CLA yet**\n\nPlease [sign it here](${claUrl}). The check updates on its own once you have.`
    );
  }

  if (d.unlinked.length) sections.push(unlinkedSection(d, recheckUrl));

  if (d.otherUnsigned.length) {
    sections.push(
      [
        "**Some co-authors haven't signed the CLA**",
        '',
        "Everyone who authored a commit in this PR needs to sign. These authors haven't yet:",
        '',
        ...d.otherUnsigned.map((o) => `- @${o.login}: ${codeList(o.shas)}`),
        '',
        `Each of them needs to [sign the CLA](${claUrl}). Otherwise, remove their commits or re-author them with your own email, then force-push.`,
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

// ─── Main entry ─────────────────────────────────────────────────────────────

export interface ProcessOptions {
  github: Octokit;
  owner: string;
  repo: string;
  dryRun: boolean;
  reminderDays: number;
  closeDays: number;
  exemptLabels: string[];
  /** Restrict the run to these PR numbers (for testing against known cases). */
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
  action: PlannedAction['type'];
  detail: string;
}

export async function processUnsignedClaPRs(opts: ProcessOptions): Promise<ProcessResult[]> {
  const { github, owner, repo, dryRun, log } = opts;
  const now = opts.now ?? Date.now();
  const exempt = new Set(opts.exemptLabels.map((l) => l.toLowerCase()));
  const results: ProcessResult[] = [];
  const prefix = dryRun ? '[DRY RUN] ' : '';

  let prs = await listOpenPRs(github, owner, repo);
  if (opts.only?.length) prs = prs.filter((p) => opts.only!.includes(p.number));
  log(`Found ${prs.length} open PRs`);

  for (const pr of prs) {
    if (pr.isBot) continue;
    if (INTERNAL_ASSOCIATIONS.has(pr.association)) continue;
    const exemptLabel = pr.labels.find((l) => exempt.has(l.toLowerCase()));
    if (exemptLabel) {
      log(`PR #${pr.number}: skipped (label "${exemptLabel}")`);
      continue;
    }
    if (!pr.cla) {
      log(`PR #${pr.number}: skipped (no ${CLA_STATUS_CONTEXT} status yet)`);
      continue;
    }
    if (pr.cla.state === 'SUCCESS') continue;

    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: pr.number,
      per_page: 100,
    });
    const botComment = comments.find((c) => c.user?.login === CLA_BOT_LOGIN);
    const ours = comments.filter((c) => c.user?.login === ACTIONS_BOT_LOGIN);
    const reminder = ours.find((c) => c.body?.includes(REMINDER_MARKER));
    const closedNotice = ours.find((c) => c.body?.includes(CLOSED_MARKER));

    const unsignedSince = new Date(botComment?.created_at ?? pr.createdAt).getTime();
    const plan = planAction({
      unsignedSince,
      reminderAt: reminder ? new Date(reminder.created_at).getTime() : null,
      closedNoticeAt: closedNotice ? new Date(closedNotice.created_at).getTime() : null,
      now,
      reminderDays: opts.reminderDays,
      closeDays: opts.closeDays,
    });

    const claUrl =
      pr.cla.targetUrl ?? `https://cla.strapi.io/${owner}/${repo}?pullRequest=${pr.number}`;
    const recheckUrl = `https://cla.strapi.io/check/${owner}/${repo}?pullRequest=${pr.number}`;
    const result: ProcessResult = {
      pr: pr.number,
      login: pr.login,
      days: plan.days,
      action: plan.type,
      detail: '',
    };
    results.push(result);

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
      if (!dryRun) {
        await github.rest.issues.createComment({
          owner,
          repo,
          issue_number: pr.number,
          body: buildCloseComment({ login: pr.login, claUrl, closeDays: opts.closeDays }),
        });
        await github.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' });
        await opts.onClosed?.(pr.number);
      }
    } else {
      result.detail = plan.type === 'wait' ? plan.reason : '';
      log(
        `PR #${pr.number} (@${pr.login}): unsigned for ${plan.days}d → ${plan.type}${
          result.detail ? ` (${result.detail})` : ''
        }`
      );
    }
  }

  return results;
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
