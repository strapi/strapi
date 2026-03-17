import * as core from '@actions/core';
import { AREA_TIERS, validateConfig } from './config.js';
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
import { syncToLinear, findSiblingPRs } from './syncer.js';
import { printReport, generateMarkdownReport } from './reporter.js';
import { selectSprintPRs, formatSprintUpdate, postSprintUpdate } from './sprint.js';
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
  const dryRun = core.getInput('dry-run') !== 'false';
  const prNumber = core.getInput('pr-number');
  const weeklyUpdate = core.getInput('weekly-update') === 'true';

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

  // Generate markdown report
  const reportPath = `reports/triage-${new Date().toISOString().split('T')[0]}.md`;
  generateMarkdownReport(scoredPRs, reportPath);
  core.setOutput('report-path', reportPath);
  console.log(`Markdown report saved to: ${reportPath}\n`);

  // Write report to job summary
  const { readFileSync } = await import('node:fs');
  const reportContent = readFileSync(reportPath, 'utf-8');
  await core.summary.addRaw(reportContent).write();

  if (weeklyUpdate) {
    const sprintPRs = selectSprintPRs(scoredPRs);
    console.log(`\nWeekly recommendation (${sprintPRs.length} PRs):\n`);
    console.log(formatSprintUpdate(sprintPRs, scoredPRs.length));

    if (!dryRun) {
      const url = await postSprintUpdate(sprintPRs, scoredPRs.length);
      console.log(`Weekly update posted: ${url}\n`);
    } else {
      console.log('[DRY RUN] Skipping weekly update post.\n');
    }
  }

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

  if (dryRun) {
    console.log('[DRY RUN] Skipping Linear sync.\n');
    core.setOutput('created', '0');
    core.setOutput('updated', '0');
    core.setOutput('closed', '0');
  } else {
    console.log('Fetching recently merged PRs...');
    const mergedPRNumbers = fetchRecentlyMergedPRNumbers();
    console.log(`Found ${mergedPRNumbers.size} recently merged PRs.\n`);

    console.log('Syncing to Linear...');
    const stats = await syncToLinear(scoredPRs, mergedPRNumbers);
    console.log(
      `Linear sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.closed} closed, ${stats.relationsCreated} relations linked.\n`
    );

    core.setOutput('created', String(stats.created));
    core.setOutput('updated', String(stats.updated));
    core.setOutput('closed', String(stats.closed));
  }
}

main().catch((err) => {
  core.setFailed(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
});
