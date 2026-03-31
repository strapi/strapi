import * as core from '@actions/core';
import { AREA_TIERS, LINEAR_CMS_TEAM_ID, validateConfig } from './config.js';
import {
  fetchInternalAuthors,
  fetchCommunityPRs,
  fetchSinglePR,
  fetchRecentlyMergedPRNumbers,
  fetchIssue,
  parseIssueRefs,
  parseLinkedIssueData,
  extractArea,
  estimateAreaFromFiles,
} from './fetcher.js';
import { calculateValue, calculateComplexity, calculatePriority, isQuickWin } from './scorer.js';
import { syncToLinear, findSiblingPRs, fetchExistingPRSummary } from './syncer.js';
import { printReport, generateMarkdownReport } from './reporter.js';
import type { SyncPreview, PickedUpPR } from './reporter.js';
import { generateProjectUpdate } from './project-update.js';
import type { ScoredPR, LinkedIssueData } from './types.js';

function getAreaTier(area: string): string {
  for (const [tier, areas] of Object.entries(AREA_TIERS)) {
    if (areas.includes(area)) return tier;
  }
  return 'medium';
}

function getPRType(labels: string[]): string {
  for (const label of labels) {
    if (label.startsWith('pr: ')) return label.replace('pr: ', '');
  }
  return 'unknown';
}

async function scorePR(pr: import('./types.js').GitHubPR): Promise<ScoredPR> {
  const issueNumbers = parseIssueRefs(pr.body);
  const linkedIssues: LinkedIssueData[] = [];

  for (const num of issueNumbers) {
    const issue = await fetchIssue(num);
    if (issue) linkedIssues.push(parseLinkedIssueData(issue));
  }

  const ageDays = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000);
  let area = extractArea(pr.labels);
  if (area === 'unknown') area = estimateAreaFromFiles(pr.files);
  const areaTier = getAreaTier(area);
  const loc = pr.additions + pr.deletions;

  const value = calculateValue(pr, linkedIssues, ageDays);
  const complexity = calculateComplexity(loc, pr.changedFiles, areaTier);
  const priority = calculatePriority(value.total);

  return {
    pr,
    linkedIssues,
    value,
    complexity,
    priority,
    area,
    areaTier,
    prType: getPRType(pr.labels),
    isQuickWin: isQuickWin(value.total, complexity),
  };
}

async function main() {
  const doSync = core.getInput('sync') === 'true';
  const doUpdate = core.getInput('update') === 'true';
  const dryRun = core.getInput('dry-run') !== 'false' || (!doSync && !doUpdate);
  const prNumber = core.getInput('pr-number');

  if (!dryRun) {
    validateConfig();
  }

  // Single-PR mode: fetch one PR, score it, sync immediately
  if (prNumber) {
    const num = parseInt(prNumber, 10);
    console.log(`Fetching PR #${num}...`);
    const pr = fetchSinglePR(num);
    const scored = await scorePR(pr);

    console.log(
      `PR #${num}: value=${scored.value.total}, priority=${scored.priority}, complexity=${scored.complexity}, area=${scored.area}`
    );

    if (dryRun) {
      console.log('[DRY RUN] Skipping Linear sync.\n');
    } else {
      console.log('Syncing to Linear...');
      const stats = await syncToLinear([scored]);
      console.log(
        `Linear sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.relationsCreated} relations linked.\n`
      );
    }

    core.setOutput('created', dryRun ? '0' : '1');
    core.setOutput('updated', '0');
    core.setOutput('closed', '0');
    return;
  }

  // Full triage mode
  console.log('Fetching internal authors from GitHub org...');
  const internalAuthors = fetchInternalAuthors();
  console.log(`Found ${internalAuthors.size} internal authors.\n`);

  console.log('Fetching community PRs from GitHub...');
  const prs = fetchCommunityPRs(internalAuthors);
  console.log(`Found ${prs.length} community PRs.\n`);

  console.log('Fetching linked issue data...');
  const scoredPRs: ScoredPR[] = [];

  for (const pr of prs) {
    scoredPRs.push(await scorePR(pr));
  }

  scoredPRs.sort((a, b) => b.value.total - a.value.total);
  printReport(scoredPRs);

  // Preview sibling PR relations
  const siblingPairs = findSiblingPRs(scoredPRs);
  if (siblingPairs.length > 0) {
    console.log(`Sibling PRs (shared GitHub issues) — ${siblingPairs.length} relation(s) to link:`);
    for (const [a, b] of siblingPairs) {
      const prA = scoredPRs.find((s) => s.pr.number === a);
      const prB = scoredPRs.find((s) => s.pr.number === b);
      const titleA = prA ? prA.pr.title.slice(0, 60) : `#${a}`;
      const titleB = prB ? prB.pr.title.slice(0, 60) : `#${b}`;
      console.log(`  PR #${a} (${titleA}) ↔ PR #${b} (${titleB})`);
    }
    console.log();
  }

  // Fetch sync preview
  let syncPreview: SyncPreview | undefined;
  const apiKey = process.env.LINEAR_API_KEY;
  if (apiKey) {
    const { LinearClient } = await import('@linear/sdk');
    const client = new LinearClient({ apiKey });
    console.log('Fetching existing Linear tickets for sync preview...');
    const prSummary = await fetchExistingPRSummary(client);
    const newPRs = scoredPRs.filter((s) => !prSummary.has(s.pr.number));
    const existingCount = scoredPRs.filter((s) => prSummary.has(s.pr.number)).length;

    const pickedUpPRs: PickedUpPR[] = [];
    for (const [prNum, summary] of prSummary) {
      if (summary.teamId === LINEAR_CMS_TEAM_ID) {
        const scored = scoredPRs.find((s) => s.pr.number === prNum);
        pickedUpPRs.push({
          prNumber: prNum,
          title: scored?.pr.title ?? `PR #${prNum}`,
          identifier: summary.identifier,
          status: summary.status,
        });
      }
    }

    syncPreview = { newPRs, existingCount, pickedUpPRs };
    console.log(
      `Sync preview: ${newPRs.length} new, ${existingCount} existing, ${pickedUpPRs.length} picked up by CMS.`
    );
  }

  // Generate markdown report (includes sync preview)
  const reportPath = `reports/triage-${new Date().toISOString().split('T')[0]}.md`;
  generateMarkdownReport(scoredPRs, reportPath, syncPreview);
  core.setOutput('report-path', reportPath);
  console.log(`Markdown report saved to: ${reportPath}\n`);

  // Write report to job summary
  const { readFileSync } = await import('node:fs');
  const reportContent = readFileSync(reportPath, 'utf-8');
  await core.summary.addRaw(reportContent).write();

  // Fetch merged PRs once for both sync and update
  let mergedPRNumbers: Set<number> | undefined;
  if ((doSync && !dryRun) || doUpdate) {
    console.log('Fetching recently merged PRs...');
    mergedPRNumbers = fetchRecentlyMergedPRNumbers();
    console.log(`Found ${mergedPRNumbers.size} recently merged PRs.\n`);
  }

  // Sync to Linear
  let newlySyncedPRNumbers: Set<number> | undefined;
  if (doSync && !dryRun) {
    console.log('Syncing to Linear...');
    const stats = await syncToLinear(scoredPRs, mergedPRNumbers!);
    console.log(
      `Linear sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.closed} closed, ${stats.relationsCreated} relations linked.\n`
    );
    newlySyncedPRNumbers = new Set(stats.createdPRNumbers);

    core.setOutput('created', String(stats.created));
    core.setOutput('updated', String(stats.updated));
    core.setOutput('closed', String(stats.closed));
  } else {
    if (doSync) console.log('[DRY RUN] Skipping Linear sync.\n');
    core.setOutput('created', '0');
    core.setOutput('updated', '0');
    core.setOutput('closed', '0');
  }

  // Project update
  if (doUpdate) {
    await generateProjectUpdate(scoredPRs, mergedPRNumbers!, dryRun, newlySyncedPRNumbers);
  }
}

main().catch((err) => {
  core.setFailed(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
});
