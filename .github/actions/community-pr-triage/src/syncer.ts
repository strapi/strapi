import { LinearClient } from '@linear/sdk';
import {
  LINEAR_CPR_TEAM_ID,
  LINEAR_CMS_TEAM_ID,
  LINEAR_CMS_GITHUB_TEAM_ID,
  LINEAR_STATUSES,
  LINEAR_LABELS,
  LINEAR_TRIAGE_LABELS,
  MANAGED_LABEL_IDS,
} from './config.js';
import type { ScoredPR, PriorityTier, ComplexityTier } from './types.js';

// --- Pure helpers (unit-testable) ---

export function matchPRNumber(title: string): number | null {
  const match = title.match(/^PR #(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

export function mapPriorityToLinear(priority: PriorityTier): number {
  const map: Record<PriorityTier, number> = { urgent: 1, high: 2, normal: 3, low: 4 };
  return map[priority];
}

export function mapLabelsToLinear(ghLabels: string[]): string[] {
  return ghLabels.map((l) => LINEAR_LABELS[l]).filter((id): id is string => id !== undefined);
}

export function buildLabelIds(scored: ScoredPR): string[] {
  const ids: string[] = [];

  // PR type labels (fix, feature, etc.) — only map "pr: *" labels, not area labels
  ids.push(...mapLabelsToLinear(scored.pr.labels.filter((l) => l.startsWith('pr: '))));

  // Priority tier
  ids.push(LINEAR_TRIAGE_LABELS.priority[scored.priority]);

  // Complexity
  ids.push(LINEAR_TRIAGE_LABELS.complexity[scored.complexity]);

  // CI status
  ids.push(LINEAR_TRIAGE_LABELS.ci[scored.pr.ciStatus]);

  // Quick win
  if (scored.isQuickWin) {
    ids.push(LINEAR_TRIAGE_LABELS.quickWin);
  }

  // Has linked issue
  if (scored.linkedIssues.length > 0) {
    ids.push(LINEAR_TRIAGE_LABELS.hasLinkedIssue);
  }

  // Source area
  const sourceId = LINEAR_LABELS[scored.area];
  if (sourceId) {
    ids.push(sourceId);
  }

  return ids.filter(Boolean);
}

export function mergeLabelIds(currentLabelIds: string[], newManagedIds: string[]): string[] {
  const manualLabels = currentLabelIds.filter((id) => !MANAGED_LABEL_IDS.has(id));
  return [...new Set([...manualLabels, ...newManagedIds])];
}

export function buildDescription(scored: ScoredPR): string {
  const { pr, linkedIssues, value, complexity, priority, area, areaTier, prType, isQuickWin } =
    scored;
  const loc = pr.additions + pr.deletions;
  const ageDays = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000);
  const sizeLabel = loc < 50 ? 'S' : loc < 300 ? 'M' : loc < 1000 ? 'L' : 'XL';
  const ciEmoji = pr.ciStatus === 'passing' ? '✅' : pr.ciStatus === 'failing' ? '❌' : '⏳';
  const lastInteraction = new Date(pr.updatedAt).toISOString().split('T')[0];

  let desc = `👤 **Author**: @${pr.author}\n`;
  desc += `📦 **Area**: ${area} (${areaTier} risk tier)\n`;
  desc += `🏷️ **Type**: ${prType} | **Size**: ${sizeLabel} (${loc} LOC, ${pr.changedFiles} files)\n`;
  desc += `📅 **Age**: ${ageDays} days | ${ciEmoji} **CI**: ${pr.ciStatus}\n`;
  desc += `💬 **Last interaction**: ${lastInteraction}\n\n`;

  if (linkedIssues.length > 0) {
    desc += `### 🔗 Linked Issues\n`;
    for (const li of linkedIssues) {
      desc += `- #${li.issue.number} — ${li.issue.title} (👍 ${li.issue.thumbsUp}, 💬 ${li.issue.comments})`;
      if (li.severity !== 'none') desc += ` | 🔴 ${li.severity}`;
      if (li.status !== 'none') desc += ` | 📋 ${li.status}`;
      desc += '\n';
    }
    desc += '\n';
  }

  desc += `### 📊 Scores\n`;
  desc += `Value: (Base:${value.base} + Severity:${value.severity} + Status:${value.status} + Engagement:${value.engagement}) × Urgency:${value.urgency} = **${value.total}** → ${priority}\n`;
  desc += `Complexity: ${complexity}\n`;
  desc += `Quick Win: ${isQuickWin ? '⚡ Yes' : 'No'}\n\n`;

  if (pr.body.trim()) {
    const truncated = pr.body.length > 2000 ? pr.body.slice(0, 2000) + '…' : pr.body;
    desc += `### 📝 PR Description\n${truncated}\n\n`;
  }

  desc += `[🔗 View PR on GitHub](https://github.com/strapi/strapi/pull/${pr.number})`;

  return desc;
}

export function findSiblingPRs(scoredPRs: ScoredPR[]): [number, number][] {
  const ghIssueToPRs = new Map<number, number[]>();
  for (const scored of scoredPRs) {
    for (const linked of scored.linkedIssues) {
      const prNums = ghIssueToPRs.get(linked.issue.number) ?? [];
      prNums.push(scored.pr.number);
      ghIssueToPRs.set(linked.issue.number, prNums);
    }
  }

  const pairs = new Set<string>();
  for (const prNums of ghIssueToPRs.values()) {
    if (prNums.length < 2) continue;
    for (let i = 0; i < prNums.length; i++) {
      for (let j = i + 1; j < prNums.length; j++) {
        const a = Math.min(prNums[i], prNums[j]);
        const b = Math.max(prNums[i], prNums[j]);
        pairs.add(`${a}:${b}`);
      }
    }
  }

  return [...pairs].map((p) => {
    const [a, b] = p.split(':');
    return [Number(a), Number(b)];
  });
}

// --- I/O functions (Linear API) ---

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getRateLimitRetryAfter(err: unknown): number | null {
  const response = (err as any)?.response;
  if (!response) return null;
  const status = response.status;
  const headers = response.headers;
  const retryAfter = headers?.get?.('retry-after') ?? headers?.['retry-after'];
  if ((status === 400 || status === 429) && retryAfter) {
    return parseInt(String(retryAfter), 10);
  }
  return null;
}

async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const MAX_AUTO_WAIT_S = 65;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryAfter = getRateLimitRetryAfter(err);
      if (retryAfter !== null) {
        if (retryAfter <= MAX_AUTO_WAIT_S) {
          console.log(`Rate limited — waiting ${retryAfter}s before retry...`);
          await sleep(retryAfter * 1000);
          continue;
        }
        const resetAt = new Date(Date.now() + retryAfter * 1000).toLocaleTimeString();
        throw new Error(
          `Linear API rate limit exceeded (retry-after: ${retryAfter}s). ` +
            `Rate limit resets around ${resetAt}. Run again after that.`
        );
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface ExistingIssue {
  id: string;
  number: number;
  title: string;
  stateType: string;
  labelIds: string[];
  attachmentUrls: string[];
  teamId?: string;
}

export interface PRTicketSummary {
  teamId: string;
  identifier: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lightweight lookup: returns PR number -> ticket summary (team, identifier, status).
 * Searches CPR and CMS teams. Fast enough for dry-run previews.
 */
export async function fetchExistingPRSummary(
  client: LinearClient
): Promise<Map<number, PRTicketSummary>> {
  const result = new Map<number, PRTicketSummary>();

  for (const teamId of [LINEAR_CPR_TEAM_ID, LINEAR_CMS_TEAM_ID]) {
    let hasNext = true;
    let cursor: string | undefined;

    while (hasNext) {
      const page = await client.issues({
        filter: { team: { id: { eq: teamId } } },
        after: cursor,
        first: 100,
      });
      for (const issue of page.nodes) {
        const prNum = matchPRNumber(issue.title);
        if (!prNum) continue;
        const state = await issue.state;
        const team = await issue.team;
        result.set(prNum, {
          teamId,
          identifier: team ? `${team.key}-${issue.number}` : issue.id,
          status: state?.name ?? 'Unknown',
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
        });
      }
      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor ?? undefined;
    }
  }

  return result;
}

export async function fetchExistingPRIssues(
  client: LinearClient,
  scoredPRs: ScoredPR[]
): Promise<Map<number, ExistingIssue>> {
  const issueByPR = new Map<number, ExistingIssue>();
  const scoredPRNumbers = new Set(scoredPRs.map((s) => s.pr.number));

  // Query CPR then CMS teams directly — avoids global searchIssues + per-issue fetches.
  // CPR is processed first so its entries take priority if a PR appears in both teams.
  for (const teamId of [LINEAR_CPR_TEAM_ID, LINEAR_CMS_TEAM_ID]) {
    let hasNext = true;
    let cursor: string | undefined;

    while (hasNext) {
      const page = await withRateLimit(() =>
        client.issues({ filter: { team: { id: { eq: teamId } } }, first: 250, after: cursor })
      );

      for (const issue of page.nodes) {
        const prNum = matchPRNumber(issue.title);
        if (!prNum) continue;
        if (teamId === LINEAR_CMS_TEAM_ID && issueByPR.has(prNum)) continue; // CPR wins

        const state = issue.state ? await withRateLimit(() => issue.state!) : undefined;

        // Only fetch labels/attachments for CPR issues we'll actually update
        let labelIds: string[] = [];
        let attachmentUrls: string[] = [];
        if (teamId === LINEAR_CPR_TEAM_ID && scoredPRNumbers.has(prNum)) {
          const [labels, attachments] = await Promise.all([
            withRateLimit(() => issue.labels()),
            withRateLimit(() => issue.attachments()),
          ]);
          labelIds = labels.nodes.map((l) => l.id);
          attachmentUrls = attachments.nodes.map((a) => a.url);
        }

        issueByPR.set(prNum, {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          stateType: state?.type ?? 'triage',
          labelIds,
          attachmentUrls,
          teamId,
        });
      }

      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor ?? undefined;
    }
  }

  return issueByPR;
}

export async function syncToLinear(
  scoredPRs: ScoredPR[],
  mergedPRNumbers: Set<number> = new Set(),
  skipRelations = false
): Promise<{
  created: number;
  updated: number;
  closed: number;
  relationsCreated: number;
  createdPRNumbers: number[];
  issueUrls: Map<number, string>;
}> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('LINEAR_API_KEY environment variable is required');

  const client = new LinearClient({ apiKey });
  const stats: {
    created: number;
    updated: number;
    closed: number;
    relationsCreated: number;
    createdPRNumbers: number[];
    issueUrls: Map<number, string>;
  } = {
    created: 0,
    updated: 0,
    closed: 0,
    relationsCreated: 0,
    createdPRNumbers: [],
    issueUrls: new Map(),
  };

  // Fetch CPR team key once for URL building (avoids per-issue team fetches)
  let cprTeamKey = 'CPR';
  try {
    const cprTeam = await withRateLimit(() => client.team(LINEAR_CPR_TEAM_ID));
    cprTeamKey = cprTeam.key;
  } catch {
    /* use default */
  }

  const issueByPR = await fetchExistingPRIssues(client, scoredPRs);

  const openPRNumbers = new Set(scoredPRs.map((s) => s.pr.number));

  // Track PR Linear issue IDs for relation linking
  const prLinearIssueIds = new Map<number, string>();

  for (const scored of scoredPRs) {
    const existing = issueByPR.get(scored.pr.number);
    const linearPriority = mapPriorityToLinear(scored.priority);
    const labelIds = buildLabelIds(scored);
    const description = buildDescription(scored);

    const prUrl = `https://github.com/strapi/strapi/pull/${scored.pr.number}`;

    if (existing) {
      // Don't update issues that have been moved to another team (e.g. picked up by CMS)
      if (existing.teamId && existing.teamId !== LINEAR_CPR_TEAM_ID) {
        prLinearIssueIds.set(scored.pr.number, existing.id);
        stats.updated++;
        continue;
      }

      const updatePayload: Record<string, any> = {
        description,
        labelIds: mergeLabelIds(existing.labelIds, labelIds),
      };
      // Move triage tickets to todo
      if (existing.stateType === 'triage') {
        updatePayload.stateId = LINEAR_STATUSES.todo;
      }
      await withRateLimit(() => client.updateIssue(existing.id, updatePayload));
      prLinearIssueIds.set(scored.pr.number, existing.id);
      stats.issueUrls.set(
        scored.pr.number,
        `https://linear.app/strapi/issue/${cprTeamKey}-${existing.number}`
      );
      // Ensure PR attachment exists
      if (!existing.attachmentUrls.some((url) => url.includes(`/pull/${scored.pr.number}`))) {
        try {
          await withRateLimit(() =>
            client.createAttachment({
              issueId: existing.id,
              url: prUrl,
              title: `PR #${scored.pr.number}: ${scored.pr.title}`,
              iconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
            })
          );
        } catch {
          // Attachment creation failed, non-critical
        }
      }
      stats.updated++;
    } else {
      const result = await withRateLimit(() =>
        client.createIssue({
          teamId: LINEAR_CPR_TEAM_ID,
          title: `PR #${scored.pr.number}: ${scored.pr.title}`,
          description,
          priority: linearPriority,
          stateId: LINEAR_STATUSES.todo,
          labelIds,
        })
      );
      const created = await result.issue;
      if (created) {
        prLinearIssueIds.set(scored.pr.number, created.id);
        stats.createdPRNumbers.push(scored.pr.number);
        stats.issueUrls.set(
          scored.pr.number,
          `https://linear.app/strapi/issue/${cprTeamKey}-${created.number}`
        );
        // Attach the GitHub PR URL to the newly created issue
        try {
          await withRateLimit(() =>
            client.createAttachment({
              issueId: created.id,
              url: prUrl,
              title: `PR #${scored.pr.number}: ${scored.pr.title}`,
              iconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
            })
          );
        } catch {
          // Attachment creation failed, non-critical
        }
      }
      stats.created++;
    }
  }

  // Link PR Linear issues to related GitHub issue Linear issues (skip when AI relations are used)
  if (!skipRelations) {
    for (const scored of scoredPRs) {
      const prIssueId = prLinearIssueIds.get(scored.pr.number);
      if (!prIssueId || scored.linkedIssues.length === 0) continue;

      // Get existing relations to avoid duplicates
      const existingRelations = new Set<string>();
      try {
        const prIssue = await client.issue(prIssueId);
        const relations = await prIssue.relations();
        for (const rel of relations.nodes) {
          const related = await rel.relatedIssue;
          if (related) existingRelations.add(related.id);
        }
        const inverseRelations = await prIssue.inverseRelations();
        for (const rel of inverseRelations.nodes) {
          const related = await rel.issue;
          if (related) existingRelations.add(related.id);
        }
      } catch {
        // If we can't fetch relations, proceed anyway — duplicates will be caught by Linear
      }

      for (const linked of scored.linkedIssues) {
        const ghIssueNum = linked.issue.number;
        const relatedNodes: { id: string }[] = [];

        const relationTeamIds = new Set([
          LINEAR_CPR_TEAM_ID,
          LINEAR_CMS_TEAM_ID,
          LINEAR_CMS_GITHUB_TEAM_ID,
        ]);

        // Strategy 1: Find issues with attachment linking to the GitHub issue
        for (const teamId of relationTeamIds) {
          try {
            const byAttachment = await client.issues({
              filter: {
                team: { id: { eq: teamId } },
                attachments: { url: { contains: `strapi/strapi/issues/${ghIssueNum}` } },
              },
              first: 10,
            });
            relatedNodes.push(...byAttachment.nodes);
          } catch {
            // Attachment search failed, continue
          }
        }

        // Strategy 2: Search by issue URL in description (catches manually-created tickets)
        try {
          const bySearch = await client.searchIssues(`strapi/strapi/issues/${ghIssueNum}`, {
            first: 10,
          });
          for (const node of bySearch.nodes) {
            const team = await node.team;
            if (team && relationTeamIds.has(team.id)) {
              relatedNodes.push(node);
            }
          }
        } catch {
          // Description search failed, continue
        }

        // Strategy 3: Search by PR URL in description (catches tickets referencing the same PR)
        try {
          const byPRSearch = await client.searchIssues(`strapi/strapi/pull/${scored.pr.number}`, {
            first: 10,
          });
          for (const node of byPRSearch.nodes) {
            const team = await node.team;
            if (team && relationTeamIds.has(team.id)) {
              relatedNodes.push(node);
            }
          }
        } catch {
          // PR search failed, continue
        }

        // Deduplicate and create relations
        const seenNodeIds = new Set<string>();
        for (const node of relatedNodes) {
          if (seenNodeIds.has(node.id)) continue;
          seenNodeIds.add(node.id);
          if (node.id === prIssueId || existingRelations.has(node.id)) continue;

          try {
            await client.createIssueRelation({
              issueId: prIssueId,
              relatedIssueId: node.id,
              type: 'related' as any,
            });
            existingRelations.add(node.id);
            stats.relationsCreated++;
          } catch {
            // Relation creation failed (e.g., already exists), continue
          }
        }
      }
    }

    // Link CPR tickets that share a GitHub issue (sibling PRs)
    const siblingPairs = findSiblingPRs(scoredPRs);

    for (const [prA, prB] of siblingPairs) {
      const aId = prLinearIssueIds.get(prA);
      const bId = prLinearIssueIds.get(prB);
      if (!aId || !bId) continue;

      // Check if relation already exists
      let alreadyLinked = false;
      try {
        const issue = await client.issue(aId);
        const relations = await issue.relations();
        for (const rel of relations.nodes) {
          const related = await rel.relatedIssue;
          if (related?.id === bId) {
            alreadyLinked = true;
            break;
          }
        }
        if (!alreadyLinked) {
          const inverseRelations = await issue.inverseRelations();
          for (const rel of inverseRelations.nodes) {
            const related = await rel.issue;
            if (related?.id === bId) {
              alreadyLinked = true;
              break;
            }
          }
        }
      } catch {
        // If we can't check, try to create — Linear will reject true duplicates
      }

      if (!alreadyLinked) {
        try {
          await client.createIssueRelation({
            issueId: aId,
            relatedIssueId: bId,
            type: 'related' as any,
          });
          stats.relationsCreated++;
        } catch {
          // Relation creation failed, continue
        }
      }
    }
  } // end skipRelations

  // Close Linear issues for PRs no longer open
  for (const [prNum, issue] of issueByPR) {
    if (!openPRNumbers.has(prNum) && !['completed', 'canceled'].includes(issue.stateType)) {
      const stateId = mergedPRNumbers.has(prNum) ? LINEAR_STATUSES.done : LINEAR_STATUSES.canceled;
      await withRateLimit(() => client.updateIssue(issue.id, { stateId }));
      stats.closed++;
    }
  }

  return stats;
}
