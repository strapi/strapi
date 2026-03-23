import { execFileSync } from 'node:child_process';
import { REPO, STRAPI_ORG, BOT_PATTERNS } from './config.js';
import type { GitHubPR, GitHubIssue, LinkedIssueData } from './types.js';

// --- Pure helpers (unit-testable) ---

export function parseIssueRefs(body: string): number[] {
  const refs = new Set<number>();
  const hashPattern = /(?:fixes|closes|resolves|ref|related)?\s*#(\d{3,5})/gi;
  for (const match of body.matchAll(hashPattern)) {
    refs.add(parseInt(match[1], 10));
  }
  const urlPattern = /github\.com\/strapi\/strapi\/issues\/(\d{3,5})/g;
  for (const match of body.matchAll(urlPattern)) {
    refs.add(parseInt(match[1], 10));
  }
  return [...refs].filter((n) => n >= 100);
}

export function isCommunityAuthor(author: string, internalAuthors: Set<string>): boolean {
  if (internalAuthors.has(author)) return false;
  if (BOT_PATTERNS.some((p) => author.includes(p))) return false;
  return true;
}

export function parseCIStatus(
  checks: Array<{ status: string; conclusion: string | null }>
): 'passing' | 'failing' | 'pending' {
  if (checks.length === 0) return 'pending';
  if (checks.some((c) => c.conclusion === 'FAILURE')) return 'failing';
  if (checks.every((c) => c.status === 'COMPLETED' && c.conclusion === 'SUCCESS')) return 'passing';
  return 'pending';
}

export function extractArea(labels: string[]): string {
  for (const label of labels) {
    if (!label.startsWith('source:')) continue;
    const value = label.replace('source:', '').trim();
    const parts = value.split(':');
    return parts[parts.length - 1];
  }
  return 'unknown';
}

export function estimateAreaFromFiles(files: string[]): string {
  const counts = new Map<string, number>();
  const pattern = /^packages\/(?:core|plugins)\/([^/]+)\//;

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return 'unknown';

  let best = '';
  let max = 0;
  for (const [name, count] of counts) {
    if (count > max) {
      best = name;
      max = count;
    }
  }
  return best;
}

// --- I/O functions (gh CLI via execFileSync — no shell) ---

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
}

export function fetchRecentlyMergedPRNumbers(): Set<number> {
  try {
    const raw = gh([
      'pr',
      'list',
      '--repo',
      REPO,
      '--state',
      'merged',
      '--limit',
      '200',
      '--json',
      'number',
    ]);
    const prs = JSON.parse(raw) as Array<{ number: number }>;
    return new Set(prs.map((pr) => pr.number));
  } catch {
    return new Set();
  }
}

export function fetchInternalAuthors(): Set<string> {
  const raw = gh(['api', `orgs/${STRAPI_ORG}/members`, '--paginate', '--jq', '.[].login']);
  const logins = raw.trim().split('\n').filter(Boolean);
  return new Set(logins);
}

export function fetchCommunityPRs(internalAuthors: Set<string>): GitHubPR[] {
  const fields = [
    'number',
    'title',
    'author',
    'body',
    'labels',
    'additions',
    'deletions',
    'changedFiles',
    'createdAt',
    'updatedAt',
    'state',
    'isDraft',
    'mergedAt',
    'closedAt',
    'files',
  ].join(',');

  const raw = gh([
    'pr',
    'list',
    '--repo',
    REPO,
    '--state',
    'open',
    '--limit',
    '500',
    '--json',
    fields,
  ]);
  const prs = JSON.parse(raw) as Array<Record<string, any>>;

  const communityPRs: GitHubPR[] = prs
    .filter((pr) => isCommunityAuthor(pr.author.login, internalAuthors))
    .filter((pr) => !pr.isDraft)
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.author.login,
      body: pr.body || '',
      labels: pr.labels.map((l: any) => l.name),
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      state: pr.state,
      isDraft: pr.isDraft,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      ciStatus: 'pending' as const,
      files: (pr.files ?? []).map((f: any) => f.path),
    }));

  // Batch-fetch CI statuses via GraphQL (25 PRs per query to avoid timeouts)
  const ciMap = fetchCIStatuses(communityPRs.map((pr) => pr.number));
  for (const pr of communityPRs) {
    pr.ciStatus = ciMap.get(pr.number) ?? 'pending';
  }

  return communityPRs;
}

export function fetchCIStatuses(
  prNumbers: number[],
  batchSize = 25
): Map<number, 'passing' | 'failing' | 'pending'> {
  const result = new Map<number, 'passing' | 'failing' | 'pending'>();
  const [owner, name] = REPO.split('/');

  for (let i = 0; i < prNumbers.length; i += batchSize) {
    const batch = prNumbers.slice(i, i + batchSize);
    const aliases = batch
      .map(
        (num, idx) =>
          `pr_${idx}: pullRequest(number: ${num}) {
          number
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  contexts(last: 100) {
                    nodes {
                      ... on CheckRun { status conclusion }
                      ... on StatusContext { state }
                    }
                  }
                }
              }
            }
          }
        }`
      )
      .join('\n');

    const query = `query {
      repository(owner: "${owner}", name: "${name}") {
        ${aliases}
      }
    }`;

    try {
      const raw = gh(['api', 'graphql', '-f', `query=${query}`]);
      const data = JSON.parse(raw).data.repository;

      for (let idx = 0; idx < batch.length; idx++) {
        const prData = data[`pr_${idx}`];
        if (!prData) continue;

        const rollup = prData.commits?.nodes?.[0]?.commit?.statusCheckRollup;
        const contexts = rollup?.contexts?.nodes ?? [];

        const checks = contexts.map((ctx: any) => {
          if ('conclusion' in ctx) {
            return { status: ctx.status, conclusion: ctx.conclusion };
          }
          // StatusContext uses 'state' instead of status/conclusion
          const state = ctx.state;
          return {
            status: state === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
            conclusion:
              state === 'SUCCESS'
                ? 'SUCCESS'
                : state === 'FAILURE' || state === 'ERROR'
                  ? 'FAILURE'
                  : null,
          };
        });

        result.set(batch[idx], parseCIStatus(checks));
      }
    } catch {
      // If a batch fails, mark all PRs in it as pending
      for (const num of batch) {
        result.set(num, 'pending');
      }
    }
  }

  return result;
}

export function fetchSinglePR(prNumber: number): GitHubPR {
  const fields = [
    'number',
    'title',
    'author',
    'body',
    'labels',
    'additions',
    'deletions',
    'changedFiles',
    'createdAt',
    'updatedAt',
    'state',
    'isDraft',
    'mergedAt',
    'closedAt',
    'files',
  ].join(',');

  const raw = gh(['pr', 'view', '--repo', REPO, String(prNumber), '--json', fields]);
  const pr = JSON.parse(raw) as Record<string, any>;

  const ciMap = fetchCIStatuses([prNumber]);

  return {
    number: pr.number,
    title: pr.title,
    author: pr.author.login,
    body: pr.body || '',
    labels: pr.labels.map((l: any) => l.name),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    state: pr.state,
    isDraft: pr.isDraft,
    mergedAt: pr.mergedAt,
    closedAt: pr.closedAt,
    ciStatus: ciMap.get(prNumber) ?? 'pending',
    files: (pr.files ?? []).map((f: any) => f.path),
  };
}

export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
  try {
    const raw = gh([
      'api',
      `repos/${REPO}/issues/${issueNumber}`,
      '--jq',
      '{number: .number, title: .title, labels: [.labels[].name], thumbsUp: .reactions["+1"], comments: .comments, state: .state}',
    ]);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseLinkedIssueData(issue: GitHubIssue): LinkedIssueData {
  let severity: LinkedIssueData['severity'] = 'none';
  let status: LinkedIssueData['status'] = 'none';

  for (const label of issue.labels) {
    if (label === 'severity: critical') severity = 'critical';
    else if (label === 'severity: high' && severity !== 'critical') severity = 'high';
    else if (label === 'severity: medium' && !['critical', 'high'].includes(severity))
      severity = 'medium';
    else if (label === 'severity: low' && severity === 'none') severity = 'low';

    if (label === 'status: confirmed') status = 'confirmed';
    else if (label === 'status: pending reproduction' && status !== 'confirmed')
      status = 'pending_repro';
    else if (label === 'status: can not reproduce') status = 'cant_repro';
  }

  return { issue, severity, status };
}
