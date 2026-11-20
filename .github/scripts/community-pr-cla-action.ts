import * as core from '@actions/core';
import * as github from '@actions/github';

import { assertGithubToken } from './issue-template-check.ts';
import { parseOnlyPRs, processUnsignedClaPRs } from './community-pr-cla.ts';
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

async function linearCanceledStateId(apiKey: string, teamId: string): Promise<string | null> {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({
      query: `query ($teamId: String!) {
        team(id: $teamId) { states(filter: { type: { eq: "canceled" } }) { nodes { id } } }
      }`,
      variables: { teamId },
    }),
  });
  const data = (await res.json()) as {
    data?: { team?: { states?: { nodes: Array<{ id: string }> } } };
  };
  return data.data?.team?.states?.nodes?.[0]?.id ?? null;
}

/**
 * Cancels the PR's Linear ticket. New community tickets live in CPR, and only move to CMS once
 * picked up, so CPR is checked first. Each team's own Canceled state is used.
 */
async function cancelLinearTicket(prNumber: number): Promise<void> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return;
  const teams = [
    { name: 'CPR', id: process.env.LINEAR_CPR_TEAM_ID, canceled: undefined },
    {
      name: 'CMS',
      id: process.env.LINEAR_CMS_TEAM_ID,
      canceled: process.env.LINEAR_CMS_STATUS_CANCELED,
    },
  ];
  for (const team of teams) {
    if (!team.id) continue;
    const issue = await findLinearTicket(apiKey, team.id, prNumber);
    if (!issue) continue;
    const stateId = team.canceled || (await linearCanceledStateId(apiKey, team.id));
    if (!stateId) throw new Error(`Linear ${team.name}: no Canceled state found`);
    if (!(await updateLinearState(apiKey, issue.id, stateId))) {
      throw new Error(`Linear ${team.name}: could not cancel ${issue.title}`);
    }
    core.info(`PR #${prNumber}: Linear ${team.name} → "Canceled"`);
    return;
  }
}

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
  const only = parseOnlyPRs(process.env.CLA_ONLY_PRS);

  if (dryRun) core.info('[DRY RUN] No comments will be posted and no PRs closed');
  core.info(
    `Reminder after ${reminderDays}d, close after ${closeDays}d, exempt labels: ${
      exemptLabels.join(', ') || '(none)'
    }${only ? `, only PRs: ${only.join(', ')}` : ''}`
  );

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
    onClosed: cancelLinearTicket,
  });

  const count = (type: string) => results.filter((r) => r.action === type).length;
  const failed = results.filter((r) => r.error);
  core.info(
    `Done: ${count('remind')} reminded, ${count('close')} closed, ${count('wait')} waiting, ` +
      `${count('too-early')} too early, ${count('reopened')} reopened, ${failed.length} failed${
        dryRun ? ' (dry run)' : ''
      }`
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
        ...results.map((r) => [`#${r.pr}`, r.login, String(r.days), r.action, r.error ?? r.detail]),
      ])
      .write();
  }

  if (failed.length) {
    core.setFailed(
      `${failed.length} PR(s) failed: ${failed.map((r) => `#${r.pr} (${r.error})`).join('; ')}`
    );
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
