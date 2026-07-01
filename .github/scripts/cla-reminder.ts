import type { getOctokit } from '@actions/github';
import type { Context } from '@actions/github/lib/context';
import type * as Core from '@actions/core';

type Octokit = ReturnType<typeof getOctokit>;

interface ScriptArgs {
  github: Octokit;
  context: Context;
  core: typeof Core;
}

interface PR {
  number: number;
  labels: Array<{ name: string }>;
  user: { login: string };
  head: { sha: string };
  created_at: string;
}

interface IssueEvent {
  event: string;
  label?: { name: string };
  created_at: string;
}

const REMINDED_LABEL = 'cla: reminded';
const STALE_LABEL = 'stale';
const DAY_MS = 86_400_000;

/**
 * Returns the timestamp (ms) of the most recent time `labelName` was added to
 * the issue/PR, or null if it was never added.
 */
async function getLabelAddedAt(
  github: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string
): Promise<number | null> {
  let page = 1;
  let lastTimestamp: number | null = null;

  while (true) {
    const { data } = await github.rest.issues.listEvents({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
      page,
    });

    for (const event of data as IssueEvent[]) {
      if (event.event === 'labeled' && event.label?.name === labelName) {
        lastTimestamp = new Date(event.created_at).getTime();
      }
    }

    if (data.length < 100) break;
    page++;
  }

  return lastTimestamp;
}

/**
 * Determines whether the CLA has been signed for a PR.
 * The CLA Assistant bot (cla.strapi.io) reports via a commit status whose
 * context defaults to `license/cla`. Returns:
 *   true  — signed (status success)
 *   false — not signed (status pending/failure/error)
 *   null  — no CLA status found (cannot determine — caller should skip)
 */
async function getClaSigned(
  github: Octokit,
  owner: string,
  repo: string,
  sha: string,
  claContext: string
): Promise<boolean | null> {
  // Commit statuses (CLA Assistant uses these).
  const { data: combined } = await github.rest.repos.getCombinedStatusForRef({
    owner,
    repo,
    ref: sha,
  });
  const status = combined.statuses.find((s) => s.context === claContext);
  if (status) {
    return status.state === 'success';
  }

  // Fallback: check runs whose name contains the CLA context (some setups use
  // a Checks-API integration instead of a commit status).
  const { data: checks } = await github.rest.checks.listForRef({
    owner,
    repo,
    ref: sha,
    per_page: 100,
  });
  const claCheck = checks.check_runs.find((c) =>
    c.name.toLowerCase().includes(claContext.toLowerCase())
  );
  if (claCheck) {
    return claCheck.conclusion === 'success';
  }

  return null;
}

/**
 * Timestamp (ms) of the PR author's most recent activity: the latest of the PR
 * creation, their commits, and their own comments.
 */
async function getLastAuthorActivity(
  github: Octokit,
  owner: string,
  repo: string,
  pr: PR
): Promise<number> {
  const author = pr.user.login;
  let last = new Date(pr.created_at).getTime();

  const commits = await github.paginate(github.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  for (const c of commits) {
    const date = c.commit?.author?.date ?? c.commit?.committer?.date;
    if (date) last = Math.max(last, new Date(date).getTime());
  }

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  });
  for (const comment of comments) {
    if (comment.user?.login === author && comment.created_at) {
      last = Math.max(last, new Date(comment.created_at).getTime());
    }
  }

  return last;
}

/**
 * Runs on a daily schedule. For open PRs whose CLA is not signed:
 *   - author inactive ≥ CLA_REMINDER_DAYS  → post a reminder, add "cla: reminded"
 *   - reminded ≥ CLA_STALE_DAYS ago        → add "stale"
 * If the CLA gets signed, the "cla: reminded" marker is cleaned up.
 */
export async function processClaReminders({ github, context, core }: ScriptArgs): Promise<void> {
  const reminderDays = parseInt(process.env.CLA_REMINDER_DAYS ?? '7', 10);
  const staleDays = parseInt(process.env.CLA_STALE_DAYS ?? '7', 10);
  const claContext = process.env.CLA_STATUS_CONTEXT ?? 'license/cla';
  const isDryRun = process.env.DRY_RUN === 'true';
  const { owner, repo } = context.repo;
  const now = Date.now();

  if (isDryRun) core.info('[DRY RUN] No changes will be made');
  core.info(`CLA context: "${claContext}", reminder: ${reminderDays}d, stale: ${staleDays}d`);

  const openPRs = (await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  })) as PR[];

  let reminded = 0;
  let staled = 0;
  let cleaned = 0;

  for (const pr of openPRs) {
    const labelNames = pr.labels.map((l) => l.name);

    const signed = await getClaSigned(github, owner, repo, pr.head.sha, claContext);
    if (signed === null) {
      core.info(`PR #${pr.number}: no CLA status found — skipping`);
      continue;
    }

    // ── CLA signed → clean up the reminder marker if present ────────────────
    if (signed === true) {
      if (labelNames.includes(REMINDED_LABEL)) {
        core.info(`PR #${pr.number}: CLA signed — removing "${REMINDED_LABEL}"`);
        if (!isDryRun) {
          try {
            await github.rest.issues.removeLabel({
              owner,
              repo,
              issue_number: pr.number,
              name: REMINDED_LABEL,
            });
          } catch {
            // Label may have been removed concurrently — not fatal
          }
        }
        cleaned++;
      }
      continue;
    }

    // ── CLA NOT signed ──────────────────────────────────────────────────────

    // Stage 2: already reminded long enough ago → mark stale.
    if (labelNames.includes(REMINDED_LABEL)) {
      if (labelNames.includes(STALE_LABEL)) continue;

      const remindedAt = await getLabelAddedAt(github, owner, repo, pr.number, REMINDED_LABEL);
      if (!remindedAt) continue;
      const daysSinceReminder = (now - remindedAt) / DAY_MS;
      core.info(
        `PR #${pr.number}: reminded ${Math.floor(daysSinceReminder)}d ago (stale threshold: ${staleDays}d)`
      );

      if (daysSinceReminder >= staleDays) {
        if (!isDryRun) {
          await github.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels: [STALE_LABEL],
          });
          await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: pr.number,
            body:
              `> This is a templated message\n\n` +
              `Hello @${pr.user.login},\n\n` +
              `We still haven't received a signed **Contributor License Agreement (CLA)** for this PR, ` +
              `and it's been more than **${staleDays} days** since our reminder, so we've marked it as **stale**.\n\n` +
              `We can't merge your contribution until the CLA is signed — you can sign it here: ` +
              `https://cla.strapi.io/strapi/strapi\n\n` +
              `Once signed, just push a new commit or comment and we'll pick it back up. Thank you! 💜`,
          });
        }
        staled++;
      }
      continue;
    }

    // Stage 1: not reminded yet → remind once the author has been quiet long enough.
    const lastActivity = await getLastAuthorActivity(github, owner, repo, pr);
    const daysSinceActivity = (now - lastActivity) / DAY_MS;
    core.info(
      `PR #${pr.number}: CLA unsigned, last author activity ${Math.floor(daysSinceActivity)}d ago (reminder threshold: ${reminderDays}d)`
    );

    if (daysSinceActivity >= reminderDays) {
      if (!isDryRun) {
        await github.rest.issues.createComment({
          owner,
          repo,
          issue_number: pr.number,
          body:
            `> This is a templated message\n\n` +
            `Hello @${pr.user.login},\n\n` +
            `Thanks for your contribution! Before we can merge it, we need you to sign our ` +
            `**Contributor License Agreement (CLA)** — you only need to do this once:\n\n` +
            `👉 https://cla.strapi.io/strapi/strapi\n\n` +
            `If there's no activity within **${staleDays} days** of this reminder, this PR will be marked as **stale**.\n\n` +
            `Once you've signed, push a new commit or leave a comment so we know to take another look. 💜`,
        });
        await github.rest.issues.addLabels({
          owner,
          repo,
          issue_number: pr.number,
          labels: [REMINDED_LABEL],
        });
      }
      reminded++;
    }
  }

  core.info(
    `Done: ${reminded} reminded, ${staled} marked stale, ${cleaned} cleaned up${isDryRun ? ' (dry run)' : ''}`
  );
}
