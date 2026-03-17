import { LinearClient } from '@linear/sdk';
import { LINEAR_CPR_TEAM_ID, LINEAR_PROJECT_ID } from './config.js';
import { matchPRNumber } from './syncer.js';
import type { ScoredPR } from './types.js';

// --- Pure helpers (unit-testable) ---

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

  // Sort all by value descending
  const sorted = [...scoredPRs].sort((a, b) => b.value.total - a.value.total);

  // 1. Urgent/high priority (4-5 slots)
  const urgentHigh = sorted.filter((p) => p.priority === 'urgent' || p.priority === 'high');
  pick(urgentHigh, 5);

  // 2. Quick wins across any priority (3-4 slots)
  const quickWins = sorted.filter((p) => p.isQuickWin);
  pick(quickWins, 4);

  // 3. Enhancements/features (1-2 slots)
  const features = sorted.filter((p) => p.prType === 'enhancement' || p.prType === 'feature');
  pick(features, 2);

  // Fill remaining slots with highest-value PRs
  if (selected.length < count) {
    pick(sorted, count - selected.length);
  }

  return selected;
}

export function groupByArea(prs: ScoredPR[]): Map<string, ScoredPR[]> {
  const groups = new Map<string, ScoredPR[]>();
  for (const pr of prs) {
    const area = pr.area;
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area)!.push(pr);
  }
  // Sort each group by value
  for (const prs of groups.values()) {
    prs.sort((a, b) => b.value.total - a.value.total);
  }
  return groups;
}

export function formatSprintUpdate(
  sprintPRs: ScoredPR[],
  totalPRs: number,
  linearUrls: Map<number, string> = new Map()
): string {
  const grouped = groupByArea(sprintPRs);
  const date = new Date().toISOString().split('T')[0];

  let md = `## Sprint Recommendation — ${date}\n\n`;
  md += `Selected **${sprintPRs.length}** PRs from **${totalPRs}** open community PRs.\n\n`;

  // Summary stats
  const urgent = sprintPRs.filter((p) => p.priority === 'urgent' || p.priority === 'high').length;
  const quickWins = sprintPRs.filter((p) => p.isQuickWin).length;
  const features = sprintPRs.filter(
    (p) => p.prType === 'enhancement' || p.prType === 'feature'
  ).length;
  md += `**Mix:** ${urgent} urgent/high · ${quickWins} quick wins · ${features} enhancements/features\n\n`;
  md += `---\n\n`;

  // Group by area
  const sortedAreas = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [area, prs] of sortedAreas) {
    md += `### ${area} (${prs.length})\n\n`;
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

// --- I/O functions (Linear API) ---

export async function postSprintUpdate(sprintPRs: ScoredPR[], totalPRs: number): Promise<string> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('LINEAR_API_KEY environment variable is required');

  const client = new LinearClient({ apiKey });

  // Look up Linear ticket IDs and URLs for the selected PRs
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
    cursor = result.pageInfo.endCursor;
  }

  // Find or create a milestone for this sprint (2-week target)
  const date = new Date().toISOString().split('T')[0];
  const targetDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const milestoneName = `Sprint ${date}`;

  let milestoneId: string | undefined;
  const project = await client.project(LINEAR_PROJECT_ID);
  const milestones = await project.projectMilestones();
  const existing = milestones.nodes.find((m) => m.name === milestoneName);

  if (existing) {
    milestoneId = existing.id;
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

  const body = formatSprintUpdate(sprintPRs, totalPRs, linearUrls);

  const updateResult = await client.createProjectUpdate({
    projectId: LINEAR_PROJECT_ID,
    body,
    health: 'onTrack',
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
  return update?.url ?? '';
}
