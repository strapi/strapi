import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { LinearClient, ProjectUpdateHealthType } from '@linear/sdk';
import { LINEAR_CPR_TEAM_ID, LINEAR_CMS_TEAM_ID, LINEAR_PROJECT_ID } from './config.js';
import { matchPRNumber, fetchExistingPRSummary } from './syncer.js';
import type { PRTicketSummary } from './syncer.js';
import type { ScoredPR } from './types.js';

// --- Linear helpers ---

export async function fetchLastProjectUpdateDate(client: LinearClient): Promise<Date | undefined> {
  try {
    const project = await client.project(LINEAR_PROJECT_ID);
    const updates = await project.projectUpdates({ first: 10 });
    if (updates.nodes.length === 0) return undefined;
    const sorted = [...updates.nodes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sorted[0].createdAt;
  } catch {
    return undefined;
  }
}

// --- Types ---

interface ProjectUpdateCategory {
  pickedUp: { prNumber: number; title: string; identifier: string; status: string }[];
  merged: { prNumber: number; title: string; identifier: string }[];
  inProgress: { prNumber: number; title: string; identifier: string; status: string }[];
  newPRs: ScoredPR[];
  newSinceLastUpdate: ScoredPR[];
  closed: { prNumber: number; title: string; identifier: string }[];
  stale: { prNumber: number; title: string; identifier: string; ageDays: number }[];
}

// --- Pure helpers ---

export function categorizeTickets(
  scoredPRs: ScoredPR[],
  mergedPRNumbers: Set<number>,
  prSummary: Map<number, PRTicketSummary>,
  lastUpdateDate?: Date,
  newlySyncedPRNumbers?: Set<number>
): ProjectUpdateCategory {
  const categories: ProjectUpdateCategory = {
    pickedUp: [],
    merged: [],
    inProgress: [],
    newPRs: [],
    newSinceLastUpdate: [],
    closed: [],
    stale: [],
  };

  const openPRNumbers = new Set(scoredPRs.map((s) => s.pr.number));

  // Categorize tickets found in Linear
  for (const [prNum, summary] of prSummary) {
    const scored = scoredPRs.find((s) => s.pr.number === prNum);
    const title = scored?.pr.title ?? `PR #${prNum}`;

    // Picked up by CMS team
    if (summary.teamId === LINEAR_CMS_TEAM_ID) {
      categories.pickedUp.push({
        prNumber: prNum,
        title,
        identifier: summary.identifier,
        status: summary.status,
      });
      continue;
    }

    // PR no longer open
    if (!openPRNumbers.has(prNum)) {
      if (mergedPRNumbers.has(prNum)) {
        categories.merged.push({ prNumber: prNum, title, identifier: summary.identifier });
      } else {
        categories.closed.push({ prNumber: prNum, title, identifier: summary.identifier });
      }
      continue;
    }

    // Still in CPR team
    if (summary.teamId === LINEAR_CPR_TEAM_ID) {
      const statusLower = summary.status.toLowerCase();
      if (statusLower !== 'todo' && statusLower !== 'triage') {
        categories.inProgress.push({
          prNumber: prNum,
          title,
          identifier: summary.identifier,
          status: summary.status,
        });
      } else {
        // Check if stale (>14 days since the ticket was last updated in Linear)
        const ageDays = Math.floor((Date.now() - summary.updatedAt.getTime()) / 86400000);
        if (ageDays > 14) {
          categories.stale.push({
            prNumber: prNum,
            title,
            identifier: summary.identifier,
            ageDays,
          });
        }
      }
    }
  }

  // New PRs not yet in Linear
  for (const scored of scoredPRs) {
    if (!prSummary.has(scored.pr.number)) {
      categories.newPRs.push(scored);
    }
  }

  // PRs new since last update — prefer explicit sync list, fall back to Linear timestamp
  if (newlySyncedPRNumbers) {
    for (const scored of scoredPRs) {
      if (newlySyncedPRNumbers.has(scored.pr.number)) {
        categories.newSinceLastUpdate.push(scored);
      }
    }
    categories.newSinceLastUpdate.sort((a, b) => b.value.total - a.value.total);
  } else if (lastUpdateDate) {
    for (const scored of scoredPRs) {
      const summary = prSummary.get(scored.pr.number);
      if (summary && summary.teamId === LINEAR_CPR_TEAM_ID && summary.createdAt > lastUpdateDate) {
        categories.newSinceLastUpdate.push(scored);
      }
    }
    categories.newSinceLastUpdate.sort((a, b) => b.value.total - a.value.total);
  }

  // Sort stale by age descending
  categories.stale.sort((a, b) => b.ageDays - a.ageDays);

  return categories;
}

export function selectSprintPRs(scoredPRs: ScoredPR[], count = 10): ScoredPR[] {
  const selected: ScoredPR[] = [];
  const used = new Set<number>();

  const pick = (prs: ScoredPR[], n: number) => {
    for (const pr of prs) {
      if (selected.length >= count || n <= 0) break;
      if (used.has(pr.pr.number)) continue;
      selected.push(pr);
      used.add(pr.pr.number);
      n--;
    }
  };

  const sorted = [...scoredPRs].sort((a, b) => b.value.total - a.value.total);

  // 1. Urgent/high priority (4-5 slots)
  pick(
    sorted.filter((p) => p.priority === 'urgent' || p.priority === 'high'),
    5
  );
  // 2. Quick wins (3-4 slots)
  pick(
    sorted.filter((p) => p.isQuickWin),
    4
  );
  // 3. Enhancements/features (1-2 slots)
  pick(
    sorted.filter((p) => p.prType === 'enhancement' || p.prType === 'feature'),
    2
  );
  // Fill remaining
  if (selected.length < count) pick(sorted, count - selected.length);

  return selected;
}

function formatSprintSection(
  sprintPRs: ScoredPR[],
  totalPRs: number,
  linearUrls: Map<number, string>
): string {
  const grouped = new Map<string, ScoredPR[]>();
  for (const pr of sprintPRs) {
    if (!grouped.has(pr.area)) grouped.set(pr.area, []);
    grouped.get(pr.area)!.push(pr);
  }
  for (const prs of grouped.values()) prs.sort((a, b) => b.value.total - a.value.total);

  const urgent = sprintPRs.filter((p) => p.priority === 'urgent' || p.priority === 'high').length;
  const quickWins = sprintPRs.filter((p) => p.isQuickWin).length;
  const features = sprintPRs.filter(
    (p) => p.prType === 'enhancement' || p.prType === 'feature'
  ).length;

  let md = `### Sprint Recommendation\n\n`;
  md += `Selected **${sprintPRs.length}** PRs from **${totalPRs}** open community PRs.\n`;
  md += `**Mix:** ${urgent} urgent/high · ${quickWins} quick wins · ${features} enhancements/features\n\n`;

  const sortedAreas = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [area, prs] of sortedAreas) {
    md += `#### ${area} (${prs.length})\n\n`;
    for (const pr of prs) {
      const loc = pr.pr.additions + pr.pr.deletions;
      const sizeLabel = loc < 50 ? 'S' : loc < 300 ? 'M' : loc < 1000 ? 'L' : 'XL';
      const tags: string[] = [];
      if (pr.priority === 'urgent') tags.push('🔴 urgent');
      else if (pr.priority === 'high') tags.push('🟠 high');
      if (pr.isQuickWin) tags.push('⚡ quick win');
      const ciIcon =
        pr.pr.ciStatus === 'passing' ? '✅' : pr.pr.ciStatus === 'failing' ? '❌' : '⏳';
      const linearUrl = linearUrls.get(pr.pr.number);
      const ticketRef = linearUrl ? ` · ${linearUrl}` : '';

      md += `- [**#${pr.pr.number}**](https://github.com/strapi/strapi/pull/${pr.pr.number}) ${pr.pr.title}\n`;
      md += `  ${pr.prType} · ${sizeLabel} (${loc} LOC) · ${ciIcon} CI · value ${pr.value.total}`;
      if (tags.length > 0) md += ` · ${tags.join(' · ')}`;
      md += `${ticketRef}\n`;
    }
    md += '\n';
  }

  return md;
}

export function formatProjectUpdate(
  categories: ProjectUpdateCategory,
  scoredPRs: ScoredPR[],
  sprintPRs?: ScoredPR[],
  linearUrls?: Map<number, string>
): string {
  const date = new Date().toISOString().split('T')[0];
  const totalPRs = scoredPRs.length;

  const quickWins = scoredPRs.filter((p) => p.isQuickWin).length;
  const stale60d = scoredPRs.filter(
    (p) => (Date.now() - new Date(p.pr.createdAt).getTime()) / 86400000 > 60
  ).length;
  const passing = scoredPRs.filter((p) => p.pr.ciStatus === 'passing').length;
  const failing = scoredPRs.filter((p) => p.pr.ciStatus === 'failing').length;
  const pending = totalPRs - passing - failing;

  const existingCount = totalPRs - categories.newPRs.length;

  let md = `## Community PR Project Update — ${date}\n\n`;

  // Header stats
  md += `**Date:** ${date}  \n`;
  md += `**Total PRs:** ${totalPRs} | **Quick Wins:** ${quickWins} | **Stale (>60d):** ${stale60d}  \n`;
  md += `**CI:** ${passing} passing, ${failing} failing, ${pending} pending\n\n`;

  // Sync Preview
  md += `## Sync Preview\n\n`;
  md += `**${categories.newPRs.length}** new | **${existingCount}** existing | **${categories.pickedUp.length}** picked up by CMS\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `- **${totalPRs}** open community PRs tracked\n`;
  md += `- **${categories.pickedUp.length}** picked up by CMS team\n`;
  md += `- **${categories.merged.length}** merged\n`;
  md += `- **${categories.inProgress.length}** in progress (CPR)\n`;
  md += `- **${categories.newPRs.length}** new PRs awaiting triage (since last update)\n`;
  md += `- **${categories.closed.length}** closed (not merged)\n`;
  md += `- **${categories.stale.length}** stale (>14 days in Todo)\n\n`;

  // New PRs since last update (before sprint recommendation)
  if (categories.newSinceLastUpdate.length > 0) {
    md += `## New PRs Since Last Update\n\n`;
    md += `| PR | Title | Author | Type | Area | Size | CI | Value |\n`;
    md += `|----|-------|--------|------|------|------|----|-------|\n`;
    for (const pr of categories.newSinceLastUpdate) {
      const loc = pr.pr.additions + pr.pr.deletions;
      const size = loc < 50 ? 'S' : loc < 300 ? 'M' : loc < 1000 ? 'L' : 'XL';
      const ci =
        pr.pr.ciStatus === 'passing'
          ? ':white_check_mark:'
          : pr.pr.ciStatus === 'failing'
            ? ':x:'
            : ':hourglass:';
      md += `| [#${pr.pr.number}](https://github.com/strapi/strapi/pull/${pr.pr.number}) | ${pr.pr.title} | ${pr.pr.author} | ${pr.prType} | ${pr.area} | ${size} | ${ci} | ${pr.value.total} |\n`;
    }
    md += '\n';
  }

  // Sprint recommendation
  if (sprintPRs && sprintPRs.length > 0) {
    md += formatSprintSection(sprintPRs, totalPRs, linearUrls ?? new Map());
  }

  // Picked up
  if (categories.pickedUp.length > 0) {
    md += `### Picked Up (transferred to CMS)\n\n`;
    for (const p of categories.pickedUp) {
      md += `- [**#${p.prNumber}**](https://github.com/strapi/strapi/pull/${p.prNumber}) ${p.title.slice(0, 70)}\n`;
      md += `  ${p.identifier} · ${p.status}\n`;
    }
    md += '\n';
  }

  // Merged
  if (categories.merged.length > 0) {
    md += `### Merged\n\n`;
    for (const p of categories.merged) {
      md += `- [**#${p.prNumber}**](https://github.com/strapi/strapi/pull/${p.prNumber}) ${p.title.slice(0, 70)} (${p.identifier})\n`;
    }
    md += '\n';
  }

  // In progress
  if (categories.inProgress.length > 0) {
    md += `### In Progress (CPR team)\n\n`;
    for (const p of categories.inProgress) {
      md += `- [**#${p.prNumber}**](https://github.com/strapi/strapi/pull/${p.prNumber}) ${p.title.slice(0, 70)}\n`;
      md += `  ${p.identifier} · ${p.status}\n`;
    }
    md += '\n';
  }

  // New
  if (categories.newPRs.length > 0) {
    md += `### New (not yet synced)\n\n`;
    for (const s of categories.newPRs) {
      md += `- [**#${s.pr.number}**](https://github.com/strapi/strapi/pull/${s.pr.number}) ${s.pr.title.slice(0, 70)}\n`;
      md += `  @${s.pr.author} · ${s.area} · value ${s.value.total}\n`;
    }
    md += '\n';
  }

  // Closed
  if (categories.closed.length > 0) {
    md += `### Closed (not merged)\n\n`;
    for (const p of categories.closed) {
      md += `- [**#${p.prNumber}**](https://github.com/strapi/strapi/pull/${p.prNumber}) ${p.title.slice(0, 70)} (${p.identifier})\n`;
    }
    md += '\n';
  }

  // Stale
  if (categories.stale.length > 0) {
    md += `### Stale (>14 days in Todo)\n\n`;
    for (const p of categories.stale) {
      md += `- [**#${p.prNumber}**](https://github.com/strapi/strapi/pull/${p.prNumber}) ${p.title.slice(0, 70)}\n`;
      md += `  ${p.identifier} · ${p.ageDays} days\n`;
    }
    md += '\n';
  }

  return md;
}

// --- I/O functions ---

export async function generateProjectUpdate(
  scoredPRs: ScoredPR[],
  mergedPRNumbers: Set<number>,
  dryRun: boolean,
  newlySyncedPRNumbers?: Set<number>
): Promise<string> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('LINEAR_API_KEY environment variable is required');

  const client = new LinearClient({ apiKey });

  console.log('Fetching Linear ticket state for project update...');
  const [prSummary, lastUpdateDate] = await Promise.all([
    fetchExistingPRSummary(client),
    fetchLastProjectUpdateDate(client),
  ]);

  if (lastUpdateDate) {
    console.log(`Last project update: ${lastUpdateDate.toISOString().split('T')[0]}`);
  } else {
    console.log('No previous project update found — all tickets treated as existing.');
  }

  const categories = categorizeTickets(
    scoredPRs,
    mergedPRNumbers,
    prSummary,
    lastUpdateDate,
    newlySyncedPRNumbers
  );

  // Sprint recommendation: select top PRs and look up their Linear URLs
  const sprintPRs = selectSprintPRs(scoredPRs);
  const linearUrls = new Map<number, string>();
  const linearIds = new Map<number, string>();
  let hasNext = true;
  let cursor: string | undefined;

  while (hasNext) {
    const result = await client.issues({
      filter: { team: { id: { eq: LINEAR_CPR_TEAM_ID } } },
      after: cursor,
      first: 100,
    });
    for (const issue of result.nodes) {
      const prNum = matchPRNumber(issue.title);
      if (prNum) {
        linearUrls.set(prNum, issue.url);
        linearIds.set(prNum, issue.id);
      }
    }
    hasNext = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor ?? undefined;
  }

  const body = formatProjectUpdate(categories, scoredPRs, sprintPRs, linearUrls);

  // Save markdown report
  const date = new Date().toISOString().split('T')[0];
  const reportPath = `reports/update-${date}.md`;
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, body);
  console.log(`Project update report saved to: ${reportPath}`);

  // Print to console
  console.log('\n' + body);

  if (dryRun) {
    console.log('[DRY RUN] Skipping Linear project update post.\n');
    return reportPath;
  }

  // Find or create a milestone for this sprint (2-week target)
  const targetDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const milestoneName = `Sprint ${date}`;

  let milestoneId: string | undefined;
  const project = await client.project(LINEAR_PROJECT_ID);
  const milestones = await project.projectMilestones();
  const existingMilestone = milestones.nodes.find((m) => m.name === milestoneName);

  if (existingMilestone) {
    milestoneId = existingMilestone.id;
    console.log(`Reusing existing milestone: ${milestoneName}`);
  } else {
    const milestoneResult = await client.createProjectMilestone({
      projectId: LINEAR_PROJECT_ID,
      name: milestoneName,
      targetDate,
    });
    const milestone = await milestoneResult.projectMilestone;
    milestoneId = milestone?.id;
    console.log(`Created milestone: ${milestoneName} (target: ${targetDate})`);
  }

  // Post project update to Linear
  const updateResult = await client.createProjectUpdate({
    projectId: LINEAR_PROJECT_ID,
    body,
    health: ProjectUpdateHealthType.OnTrack,
  });

  // Add sprint PR tickets to the project under the milestone
  const sprintPRNumbers = new Set(sprintPRs.map((p) => p.pr.number));
  let added = 0;
  for (const prNum of sprintPRNumbers) {
    const issueId = linearIds.get(prNum);
    if (!issueId) continue;
    try {
      const updatePayload: Record<string, any> = { projectId: LINEAR_PROJECT_ID };
      if (milestoneId) updatePayload.projectMilestoneId = milestoneId;
      await client.updateIssue(issueId, updatePayload);
      added++;
    } catch {
      // Issue may already be in the project
    }
  }
  console.log(`Added ${added} tickets to sprint project under milestone "${milestoneName}".`);

  const update = await updateResult.projectUpdate;
  if (update?.url) {
    console.log(`Project update posted to Linear: ${update.url}\n`);
  }

  return reportPath;
}
