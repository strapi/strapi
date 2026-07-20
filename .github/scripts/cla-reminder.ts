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
// CLA-specific provenance for the shared `stale` label. Added alongside `stale`
// whenever THIS script marks a PR stale, so that on signing we can tell a
// CLA-driven stale apart from a review-driven one (community-pr-lifecycle also
// uses the shared `stale` label). Both stale-adders guard on `!stale`, so only
// one flow ever owns a given `stale` label — making this marker reliable.
const CLA_STALE_LABEL = 'cla: stale';
const DAY_MS = 86_400_000;

/**
 * Removes a label, tolerating the "not present" case (404) but surfacing any
 * other failure so the caller can leave provenance intact and retry next run.
 */
async function removeLabel(
  github: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  name: string
): Promise<void> {
  try {
    await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name });
  } catch (err) {
    // 404 → label already absent (concurrent removal / never applied). Any
    // other error is real: rethrow so the run doesn't drop provenance labels.
    if ((err as { status?: number }).status === 404) return;
    throw err;
  }
}

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
 *   - reminded ≥ CLA_STALE_DAYS ago        → add "stale" + "cla: stale"
 * If the CLA gets signed, the "cla: reminded" marker is cleaned up, along with
 * the shared "stale" label — but only when this script's own "cla: stale"
 * provenance marker is present, so a review-driven "stale" (owned by the
 * community PR lifecycle) is never cleared by mistake. Otherwise the community
 * PR lifecycle would still auto-close the PR on the stale timestamp despite the
 * signed CLA.
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

    // ── CLA signed → clean up this script's own labels ─────────────────────
    if (signed === true) {
      const hasReminded = labelNames.includes(REMINDED_LABEL);
      const hasClaStale = labelNames.includes(CLA_STALE_LABEL);

      // Enter cleanup while EITHER CLA-owned label is present — not just
      // "cla: reminded". A previous run may have removed one label and failed
      // on the other; keying on both means the survivor still triggers a retry.
      if (hasReminded || hasClaStale) {
        core.info(`PR #${pr.number}: CLA signed — cleaning up CLA labels`);
        if (!isDryRun) {
          try {
            // Order matters. Drop the shared "stale" BEFORE its "cla: stale"
            // provenance: if the shared removal fails, `removeLabel` rethrows,
            // "cla: stale" stays, and the next run re-enters and retries. Only
            // touch the shared label when we own it (cla: stale present), so a
            // review-driven "stale" is never cleared.
            if (hasClaStale) {
              await removeLabel(github, owner, repo, pr.number, STALE_LABEL);
              await removeLabel(github, owner, repo, pr.number, CLA_STALE_LABEL);
            }
            if (hasReminded) {
              await removeLabel(github, owner, repo, pr.number, REMINDED_LABEL);
            }
            cleaned++;
          } catch (err) {
            core.warning(
              `PR #${pr.number}: CLA label cleanup failed (${(err as Error).message}) — ` +
                `provenance labels left in place, will retry next run`
            );
          }
        } else {
          cleaned++;
        }
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
          // Add the shared `stale` (so community-pr-lifecycle closes it) plus
          // `cla: stale` provenance (so signing can safely clear only this
          // script's stale, not a review-driven one).
          await github.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels: [STALE_LABEL, CLA_STALE_LABEL],
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
