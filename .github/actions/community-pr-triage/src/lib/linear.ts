import { LinearClient } from '@linear/sdk';
import { CommunityPR, PRAnalysis } from './types';

let linearClient: LinearClient;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initLinear(apiKey: string): void {
  linearClient = new LinearClient({ apiKey });
}

export async function resolveTeamLabels(
  teamId: string,
  preloaded: Map<string, string> | null
): Promise<Map<string, string>> {
  if (preloaded !== null) return new Map(preloaded);
  return loadTeamLabels(teamId);
}

// ---------------------------------------------------------------------------
// Label management
// ---------------------------------------------------------------------------

export async function loadTeamLabels(teamId: string): Promise<Map<string, string>> {
  const team = await linearClient.team(teamId);
  const labelMap = new Map<string, string>();
  let cursor: string | undefined = undefined;

  while (true) {
    const page = await team.labels({ first: 100, after: cursor });
    for (const label of page.nodes) {
      labelMap.set(label.name, label.id);
    }
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? undefined;
    if (!cursor) break;
  }

  return labelMap;
}

export async function ensureLabel(
  labelMap: Map<string, string>,
  teamId: string,
  name: string,
  color?: string
): Promise<string> {
  const existing = labelMap.get(name);
  if (existing) return existing;

  try {
    const result = await linearClient.createIssueLabel({
      teamId,
      name,
      color: color ?? '#6B7280',
    });
    const label = await result.issueLabel;
    if (!label) throw new Error(`Failed to create label: ${name}`);
    labelMap.set(name, label.id);
    return label.id;
  } catch (err) {
    // Race condition: another concurrent call already created this label.
    // Re-fetch the team labels and look it up instead of failing.
    if (String(err).includes('Duplicate') || String(err).includes('already exists')) {
      const fresh = await loadTeamLabels(teamId);
      const id = fresh.get(name);
      if (id) {
        labelMap.set(name, id);
        return id;
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDescription(pr: CommunityPR, analysis: PRAnalysis): string {
  const totalLOC = pr.additions + pr.deletions;
  const area = analysis.area ?? 'unknown';
  const quickWin = analysis.isQuickWin ? 'yes' : 'no';
  const body = pr.body || '_No description provided._';

  return [
    `**Author:** @${pr.author}`,
    `**Area:** ${area}`,
    `**Quick win:** ${quickWin} (${totalLOC} LOC, ${pr.changedFiles} files)`,
    `**Age:** ${analysis.daysSinceUpdate} days`,
    `**GitHub:** ${pr.url}`,
    '',
    '---',
    '',
    body,
  ].join('\n');
}

async function buildLabelIds(
  analysis: PRAnalysis,
  labelMap: Map<string, string>,
  teamId: string
): Promise<string[]> {
  const labelIds: string[] = [];
  if (analysis.area) labelIds.push(await ensureLabel(labelMap, teamId, analysis.area));
  if (analysis.isQuickWin)
    labelIds.push(await ensureLabel(labelMap, teamId, 'quick-win', '#22C55E'));
  if (analysis.isStale) labelIds.push(await ensureLabel(labelMap, teamId, 'stale', '#EF4444'));
  return labelIds;
}

// ---------------------------------------------------------------------------
// Ticket CRUD
// ---------------------------------------------------------------------------

export async function findTicketByPRNumber(
  teamId: string,
  prNumber: number
): Promise<{ id: string; identifier: string; url: string } | null> {
  const result = await linearClient.issues({
    filter: {
      team: { id: { eq: teamId } },
      title: { startsWith: `PR #${prNumber}:` },
    },
    first: 1,
  });

  const issue = result.nodes[0];
  if (!issue) return null;

  return { id: issue.id, identifier: issue.identifier, url: issue.url };
}

// Bulk alternative to findTicketByPRNumber — one paginated fetch for the whole team
// instead of one API call per PR. Use this when processing many PRs at once.
export async function fetchAllTicketsByPRNumber(
  teamId: string
): Promise<Map<number, { id: string; identifier: string; url: string }>> {
  const map = new Map<number, { id: string; identifier: string; url: string }>();
  let cursor: string | undefined = undefined;

  while (true) {
    const page = await linearClient.issues({
      filter: {
        team: { id: { eq: teamId } },
        title: { startsWith: 'PR #' },
      },
      first: 100,
      after: cursor,
    });

    for (const issue of page.nodes) {
      const prNumber = matchPRNumber(issue.title);
      if (prNumber !== null) {
        map.set(prNumber, { id: issue.id, identifier: issue.identifier, url: issue.url });
      }
    }

    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? undefined;
    if (!cursor) break;
  }

  return map;
}

async function findTriageStateId(teamId: string): Promise<string | undefined> {
  const team = await linearClient.team(teamId);
  const states = await team.states({ filter: { type: { eq: 'triage' } }, first: 1 });
  return states.nodes[0]?.id;
}

export async function createTicket(
  pr: CommunityPR,
  analysis: PRAnalysis,
  teamId: string,
  projectId: string,
  labelMap: Map<string, string>
): Promise<{ identifier: string; url: string }> {
  const title = `PR #${pr.number}: ${pr.title}`;
  const description = buildDescription(pr, analysis);
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);
  const stateId = await findTriageStateId(teamId);

  const result = await linearClient.createIssue({
    teamId,
    projectId,
    title,
    description,
    labelIds,
    stateId,
  });

  const issue = await result.issue;
  if (!issue) throw new Error(`Failed to create Linear issue for PR #${pr.number}`);

  await linearClient.createAttachment({
    issueId: issue.id,
    title: 'GitHub PR',
    url: pr.url,
  });

  return {
    identifier: issue.identifier,
    url: issue.url,
  };
}

export async function updateTicket(
  issueId: string,
  pr: CommunityPR,
  analysis: PRAnalysis,
  labelMap: Map<string, string>,
  teamId: string
): Promise<void> {
  const title = `PR #${pr.number}: ${pr.title}`;
  const description = buildDescription(pr, analysis);
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);

  await linearClient.updateIssue(issueId, { title, description, labelIds });
}

export async function updateTicketLabels(
  issueId: string,
  analysis: PRAnalysis,
  labelMap: Map<string, string>,
  teamId: string
): Promise<void> {
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);
  await linearClient.updateIssue(issueId, { labelIds });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const PR_NUMBER_RE = /PR #(\d+)/;

function matchPRNumber(title: string): number | null {
  const match = PR_NUMBER_RE.exec(title);
  return match ? parseInt(match[1], 10) : null;
}

export async function fetchCMSPickups(
  cmsTeamId: string,
  since: string
): Promise<Array<{ prNumber: number; title: string; cmsIdentifier: string }>> {
  const results: Array<{ prNumber: number; title: string; cmsIdentifier: string }> = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const page = await linearClient.issues({
      filter: {
        team: { id: { eq: cmsTeamId } },
        title: { contains: 'PR #' },
        createdAt: { gte: since },
      },
      after: cursor,
      first: 50,
    });

    for (const issue of page.nodes) {
      const prNumber = matchPRNumber(issue.title);
      if (prNumber === null) continue;
      results.push({
        prNumber,
        title: issue.title,
        cmsIdentifier: issue.identifier,
      });
    }

    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? undefined;
    if (!cursor) break;
  }

  return results;
}

export async function postProjectUpdate(projectId: string, body: string): Promise<void> {
  await linearClient.createProjectUpdate({ projectId, body });
}
