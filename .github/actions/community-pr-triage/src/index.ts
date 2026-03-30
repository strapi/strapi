import 'dotenv/config';
import { createInterface } from 'node:readline';
import { AREA_TIERS, validateConfig } from './config.js';
import {
  fetchInternalAuthors,
  fetchCommunityPRs,
  fetchRecentlyMergedPRNumbers,
  fetchIssue,
  parseIssueRefs,
  parseLinkedIssueData,
  extractArea,
  estimateAreaFromFiles,
} from './fetcher.js';
import { calculateValue, calculateComplexity, calculatePriority, isQuickWin } from './scorer.js';
import { syncToLinear, findSiblingPRs, fetchExistingPRSummary } from './syncer.js';
import { LINEAR_CMS_TEAM_ID } from './config.js';
import { printReport, generateMarkdownReport } from './reporter.js';
import { generateProjectUpdate } from './project-update.js';
import { readCache, writeCache } from './cache.js';
import type { ScoredPR, LinkedIssueData } from './types.js';

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

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

async function main() {
  validateConfig();

  const doSync = process.argv.includes('--sync');
  const doUpdate = process.argv.includes('--update');
  const dryRun = process.argv.includes('--dry-run') || (!doSync && !doUpdate);
  const autoYes = process.argv.includes('--yes') || process.argv.includes('-y');

  // --- Scored PRs: use cache if available (update-only mode), otherwise fetch fresh ---
  let scoredPRs: ScoredPR[];
  let mergedPRNumbers: Set<number> | undefined;
  let cachedSyncStats: { createdPRNumbers: number[] } | undefined;

  const updateOnly = doUpdate && !doSync;
  const cache = updateOnly ? readCache() : null;

  if (cache) {
    scoredPRs = cache.scoredPRs;
    mergedPRNumbers = new Set(cache.mergedPRNumbers);
    cachedSyncStats = cache.syncStats;
    console.log(
      `Loaded ${scoredPRs.length} PRs from cache.` +
        (cachedSyncStats
          ? ` Sync stats: ${cachedSyncStats.createdPRNumbers.length} created.`
          : '') +
        '\n'
    );
  } else {
    console.log('Fetching internal authors from GitHub org...');
    const internalAuthors = fetchInternalAuthors();
    console.log(`Found ${internalAuthors.size} internal authors.\n`);

    console.log('Fetching community PRs from GitHub...');
    const prs = fetchCommunityPRs(internalAuthors);
    console.log(`Found ${prs.length} community PRs.\n`);

    console.log('Fetching linked issue data...');
    scoredPRs = [];

    for (const pr of prs) {
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

      scoredPRs.push({
        pr,
        linkedIssues,
        value,
        complexity,
        priority,
        area,
        areaTier,
        prType: getPRType(pr.labels),
        isQuickWin: isQuickWin(value.total, complexity),
      });
    }

    scoredPRs.sort((a, b) => b.value.total - a.value.total);

    // Write initial cache (no sync stats yet)
    writeCache({ timestamp: new Date().toISOString(), scoredPRs, mergedPRNumbers: [] });
  }

  if (!cache) {
    printReport(scoredPRs);

    // Preview sibling PR relations
    const siblingPairs = findSiblingPRs(scoredPRs);
    if (siblingPairs.length > 0) {
      console.log(
        `Sibling PRs (shared GitHub issues) — ${siblingPairs.length} relation(s) to link:`
      );
      for (const [a, b] of siblingPairs) {
        const prA = scoredPRs.find((s) => s.pr.number === a);
        const prB = scoredPRs.find((s) => s.pr.number === b);
        const titleA = prA ? prA.pr.title.slice(0, 60) : `#${a}`;
        const titleB = prB ? prB.pr.title.slice(0, 60) : `#${b}`;
        console.log(`  PR #${a} (${titleA}) ↔ PR #${b} (${titleB})`);
      }
      console.log();
    }

    // Fetch sync preview (used in both dry-run report and console output)
    let syncPreview: import('./reporter.js').SyncPreview | undefined;
    const apiKey = process.env.LINEAR_API_KEY;
    if (apiKey) {
      const { LinearClient } = await import('@linear/sdk');
      const client = new LinearClient({ apiKey });
      console.log('Fetching existing Linear tickets for sync preview...');
      const prSummary = await fetchExistingPRSummary(client);
      const newPRs = scoredPRs.filter((s) => !prSummary.has(s.pr.number));
      const existingCount = scoredPRs.filter((s) => prSummary.has(s.pr.number)).length;

      const pickedUpPRs: import('./reporter.js').PickedUpPR[] = [];
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
      if (newPRs.length > 0) {
        console.log('New PRs to create:');
        for (const s of newPRs) {
          console.log(`  PR #${s.pr.number}: ${s.pr.title.slice(0, 70)}`);
        }
      }
      console.log();
    }

    // Generate markdown report
    const reportPath = `reports/triage-${new Date().toISOString().split('T')[0]}.md`;
    generateMarkdownReport(scoredPRs, reportPath, syncPreview);
    console.log(`Markdown report saved to: ${reportPath}\n`);
  }

  // Sync to Linear
  if (doSync) {
    if (dryRun) {
      console.log('[DRY RUN] Skipping Linear sync.\n');
    } else {
      const confirmed =
        autoYes ||
        (await confirm(`About to sync ${scoredPRs.length} PRs to Linear. Proceed? (y/N) `));
      if (confirmed) {
        console.log('Fetching recently merged PRs...');
        mergedPRNumbers = fetchRecentlyMergedPRNumbers();
        console.log(`Found ${mergedPRNumbers.size} recently merged PRs.\n`);
        console.log('Syncing to Linear...');
        const stats = await syncToLinear(scoredPRs, mergedPRNumbers);
        console.log(
          `Linear sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.closed} closed, ${stats.relationsCreated} relations linked.\n`
        );
        // Update cache with sync stats
        writeCache({
          timestamp: new Date().toISOString(),
          scoredPRs,
          mergedPRNumbers: [...mergedPRNumbers],
          syncStats: {
            created: stats.created,
            updated: stats.updated,
            closed: stats.closed,
            createdPRNumbers: stats.createdPRNumbers,
          },
        });
      } else {
        console.log('Sync canceled.\n');
      }
    }
  }

  // Project update
  if (doUpdate) {
    if (!mergedPRNumbers) {
      console.log('Fetching recently merged PRs...');
      mergedPRNumbers = fetchRecentlyMergedPRNumbers();
      console.log(`Found ${mergedPRNumbers.size} recently merged PRs.\n`);
    }

    const newlySyncedPRNumbers = cachedSyncStats
      ? new Set(cachedSyncStats.createdPRNumbers)
      : undefined;

    if (dryRun) {
      await generateProjectUpdate(scoredPRs, mergedPRNumbers, true, newlySyncedPRNumbers);
    } else {
      const confirmed = autoYes || (await confirm('Post project update to Linear? (y/N) '));
      if (confirmed) {
        await generateProjectUpdate(scoredPRs, mergedPRNumbers, false, newlySyncedPRNumbers);
      } else {
        console.log('Project update skipped.\n');
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
