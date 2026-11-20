import * as core from '@actions/core';
import * as github from '@actions/github';

import { assertGithubToken } from './issue-template-check.ts';
import { processUnsignedClaPRs } from './community-pr-cla.ts';
import { findLinearTicket, updateLinearState } from './community-pr-lifecycle.ts';

/**
 * Dry run unless explicitly enabled:
 * - manual dispatch: the `dry_run` input (defaults to true)
 * - schedule: live only when the `CLA_FOLLOW_UP_ENABLED` repo variable is "true"
 * - local runs: set DRY_RUN=false to go live
 */
function isDryRun(): boolean {
  const event = process.env.EVENT_NAME;
  if (event === 'schedule') return process.env.CLA_FOLLOW_UP_ENABLED !== 'true';
  return process.env.DRY_RUN !== 'false';
}

const intEnv = (name: string, fallback: number) => {
  const value = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

async function run() {
  const token = process.env.GITHUB_TOKEN;
  assertGithubToken(token);
  const octokit = github.getOctokit(token);
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? 'strapi/strapi').split('/');

  const dryRun = isDryRun();
  const reminderDays = intEnv('CLA_REMINDER_DAYS', 7);
  const closeDays = intEnv('CLA_CLOSE_DAYS', 30);
  const exemptLabels = (process.env.CLA_EXEMPT_LABELS ?? 'pr: security')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  const only = (process.env.CLA_ONLY_PRS ?? '')
    .split(/[\s,]+/)
    .map((n) => parseInt(n, 10))
    .filter(Number.isFinite);

  if (dryRun) core.info('[DRY RUN] No comments will be posted and no PRs closed');
  core.info(
    `Reminder after ${reminderDays}d, close after ${closeDays}d, exempt labels: ${
      exemptLabels.join(', ') || '(none)'
    }`
  );

  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_CMS_TEAM_ID;
  const canceledStateId = process.env.LINEAR_CMS_STATUS_CANCELED;

  const results = await processUnsignedClaPRs({
    github: octokit,
    owner,
    repo,
    dryRun,
    reminderDays,
    closeDays,
    exemptLabels,
    only,
    log: (message) => core.info(message),
    onClosed: async (prNumber) => {
      if (!apiKey || !teamId || !canceledStateId) return;
      const issue = await findLinearTicket(apiKey, teamId, prNumber);
      if (issue && (await updateLinearState(apiKey, issue.id, canceledStateId))) {
        core.info(`PR #${prNumber}: Linear → "Canceled"`);
      }
    },
  });

  const count = (type: string) => results.filter((r) => r.action === type).length;
  core.info(
    `Done: ${count('remind')} reminded, ${count('close')} closed, ${count('wait')} waiting, ` +
      `${count('too-early')} too early, ${count('reopened')} reopened${dryRun ? ' (dry run)' : ''}`
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    await core.summary
      .addHeading(`CLA follow-up${dryRun ? ' (dry run)' : ''}`)
      .addTable([
        [
          { data: 'PR', header: true },
          { data: 'Author', header: true },
          { data: 'Unsigned (days)', header: true },
          { data: 'Action', header: true },
          { data: 'Detail', header: true },
        ],
        ...results.map((r) => [`#${r.pr}`, r.login, String(r.days), r.action, r.detail]),
      ])
      .write();
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
