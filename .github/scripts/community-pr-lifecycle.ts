import type { getOctokit } from '@actions/github';
import type { Context } from '@actions/github/lib/context';
import type * as Core from '@actions/core';

type Octokit = ReturnType<typeof getOctokit>;

interface ScriptArgs {
  github: Octokit;
  context: Context;
  core: typeof Core;
}

interface LinearNode {
  id: string;
  title: string;
}

interface LinearResponse {
  data?: {
    issues?: { nodes: LinearNode[] };
    issueUpdate?: { success: boolean };
  };
  errors?: Array<{ message: string }>;
}

interface IssueEvent {
  event: string;
  label?: { name: string };
  created_at: string;
}

interface PR {
  number: number;
  labels: Array<{ name: string }>;
  user: { login: string };
}

async function linearGQL(
  apiKey: string,
  query: string,
  variables: Record<string, string> = {}
): Promise<LinearResponse> {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<LinearResponse>;
}

async function findLinearTicket(
  apiKey: string,
  teamId: string,
  prNumber: number
): Promise<LinearNode | null> {
  const data = await linearGQL(
    apiKey,
    `query ($teamId: ID!, $title: String!) {
      issues(
        filter: { team: { id: { eq: $teamId } }, title: { startsWith: $title } }
        first: 1
      ) { nodes { id title } }
    }`,
    { teamId, title: `PR #${prNumber}:` }
  );
  return data.data?.issues?.nodes?.[0] ?? null;
}

async function updateLinearState(
  apiKey: string,
  issueId: string,
  stateId: string
): Promise<boolean> {
  const data = await linearGQL(
    apiKey,
    `mutation ($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) { success }
    }`,
    { id: issueId, stateId }
  );
  return data.data?.issueUpdate?.success ?? false;
}

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
 * Triggered when "waiting on author" label is added to a PR.
 * Syncs the Linear ticket to "Waiting on Author" and posts a comment.
 */
export async function syncWaitingOnAuthor({ github, context, core }: ScriptArgs): Promise<void> {
  const pr = context.payload.pull_request as {
    number: number;
    labels: Array<{ name: string }>;
    user: { login: string };
  };
  const prNumber = pr.number;
  const labels = pr.labels.map((l) => l.name);
  const login = pr.user.login;
  const { owner, repo } = context.repo;

  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_CMS_TEAM_ID;
  const waitingStateId = process.env.LINEAR_CMS_STATUS_WAITING_ON_AUTHOR;
  const waitingDays = process.env.WAITING_ON_AUTHOR_DAYS;
  const staleDays = process.env.STALE_DAYS;

  if (!labels.includes('community')) {
    core.info('Not a community PR — skipping');
    return;
  }

  if (!apiKey || !teamId || !waitingStateId) {
    core.warning('Missing Linear config — skipping Linear sync');
  } else {
    const issue = await findLinearTicket(apiKey, teamId, prNumber);
    if (!issue) {
      core.warning(`No Linear ticket found in CMS team for PR #${prNumber}`);
    } else {
      core.info(`Found Linear ticket: ${issue.title}`);
      const ok = await updateLinearState(apiKey, issue.id, waitingStateId);
      if (ok) {
        core.info(`PR #${prNumber}: Linear → "Waiting on Author"`);
      } else {
        core.warning(`Linear update failed for PR #${prNumber}`);
      }
    }
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body:
      `> This is a templated message\n\n` +
      `Hello @${login},\n\n` +
      `Thank you for your contribution! We have left some feedback that we'd love for you to address.\n\n` +
      `Just so you're aware of the timeline:\n` +
      `- If there is no new activity within **${waitingDays} days**, this PR will be marked as **stale**\n` +
      `- Stale PRs are automatically closed after **${staleDays} more days**\n\n` +
      `Once you've pushed updates, feel free to re-request a review. We'd love to get this merged! 💜`,
  });
}

/**
 * Runs on a daily schedule. Advances the lifecycle of community PRs:
 *   "waiting on author" (≥ WAITING_ON_AUTHOR_DAYS) → stale
 *   "stale"            (≥ STALE_DAYS)              → closed + Linear canceled
 */
export async function processLifecycle({ github, context, core }: ScriptArgs): Promise<void> {
  const waitingOnAuthorDays = parseInt(process.env.WAITING_ON_AUTHOR_DAYS ?? '14', 10);
  const staleDays = parseInt(process.env.STALE_DAYS ?? '30', 10);
  const isDryRun = process.env.DRY_RUN === 'true';
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_CMS_TEAM_ID;
  const canceledStateId = process.env.LINEAR_CMS_STATUS_CANCELED;
  const { owner, repo } = context.repo;

  const DAY_MS = 86_400_000;
  const now = Date.now();

  if (isDryRun) core.info('[DRY RUN] No changes will be made');

  const allPRs = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });

  const communityPRs = (allPRs as PR[]).filter((pr) =>
    pr.labels.some((l) => l.name === 'community')
  );
  core.info(`Found ${communityPRs.length} open community PRs`);

  let promoted = 0;
  let closed = 0;

  for (const pr of communityPRs) {
    const labelNames = pr.labels.map((l) => l.name);

    // ── stale long enough → close ─────────────────────────────────────────
    if (labelNames.includes('stale')) {
      const labeledAt = await getLabelAddedAt(github, owner, repo, pr.number, 'stale');
      if (!labeledAt) continue;
      const daysStale = (now - labeledAt) / DAY_MS;
      core.info(`PR #${pr.number}: stale for ${Math.floor(daysStale)}d (threshold: ${staleDays}d)`);

      if (daysStale >= staleDays) {
        if (!isDryRun) {
          await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: pr.number,
            body:
              `> This is a templated message\n\n` +
              `Hello @${pr.user.login},\n\n` +
              `This PR has been stale for **${staleDays}+ days** with no new activity, so we are closing it to keep the backlog manageable.\n\n` +
              `If you'd like to continue working on it, please reopen the PR — we'd love to get it merged! 💜`,
          });
          await github.rest.pulls.update({
            owner,
            repo,
            pull_number: pr.number,
            state: 'closed',
          });
          if (apiKey && teamId && canceledStateId) {
            const issue = await findLinearTicket(apiKey, teamId, pr.number);
            if (issue) {
              await updateLinearState(apiKey, issue.id, canceledStateId);
              core.info(`PR #${pr.number}: Linear → "Canceled"`);
            }
          }
        }
        closed++;
        continue;
      }
    }

    // ── waiting on author long enough → stale ─────────────────────────────
    if (labelNames.includes('waiting on author') && !labelNames.includes('stale')) {
      const labeledAt = await getLabelAddedAt(github, owner, repo, pr.number, 'waiting on author');
      if (!labeledAt) continue;
      const daysWaiting = (now - labeledAt) / DAY_MS;
      core.info(
        `PR #${pr.number}: waiting on author for ${Math.floor(daysWaiting)}d (threshold: ${waitingOnAuthorDays}d)`
      );

      if (daysWaiting >= waitingOnAuthorDays) {
        if (!isDryRun) {
          try {
            await github.rest.issues.removeLabel({
              owner,
              repo,
              issue_number: pr.number,
              name: 'waiting on author',
            });
          } catch {
            // Label may have been removed concurrently — not fatal
          }
          await github.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels: ['stale'],
          });
          await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: pr.number,
            body:
              `> This is a templated message\n\n` +
              `Hello @${pr.user.login},\n\n` +
              `We haven't heard back from you in **${waitingOnAuthorDays}+ days**, so this PR has been marked as **stale**.\n\n` +
              `If you're still interested in getting this merged, please address the review feedback and push new commits. ` +
              `It will be automatically closed in **${staleDays} days** if there is no further activity.\n\n` +
              `Thank you for your contribution! 💜`,
          });
        }
        promoted++;
      }
    }
  }

  core.info(`Done: ${promoted} promoted to stale, ${closed} closed${isDryRun ? ' (dry run)' : ''}`);
}
