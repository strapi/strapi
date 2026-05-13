import * as github from '@actions/github';
import { CommunityPR } from './types';

const OWNER = 'strapi';
const REPO = 'strapi';

let octokit: ReturnType<typeof github.getOctokit>;

export function initGitHub(token: string): void {
  octokit = github.getOctokit(token);
}

export async function fetchInternalAuthors(org: string): Promise<Set<string>> {
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100,
  });
  return new Set(members.map((m) => m.login));
}

function isBot(login: string): boolean {
  return login.includes('[bot]') || login === 'dependabot' || login === 'renovate';
}

function mapPRToCommunityPR(pr: {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  labels: Array<{ name?: string | null }>;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  head: { sha: string };
}): CommunityPR {
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? '',
    author: pr.user?.login ?? 'unknown',
    labels: pr.labels.map((l) => l.name ?? ''),
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changedFiles: pr.changed_files ?? 0,
    files: [],
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    url: pr.html_url,
    headSha: pr.head.sha,
  };
}

export async function fetchOpenCommunityPRs(internalAuthors: Set<string>): Promise<CommunityPR[]> {
  const allPRs: CommunityPR[] = [];
  let page = 1;

  while (allPRs.length < 500) {
    const response = await octokit.rest.pulls.list({
      owner: OWNER,
      repo: REPO,
      state: 'open',
      per_page: 100,
      page,
    });

    if (response.data.length === 0) break;

    for (const pr of response.data) {
      if (allPRs.length >= 500) break;
      if (pr.draft) continue;
      const login = pr.user?.login ?? '';
      if (isBot(login)) continue;
      if (internalAuthors.has(login)) continue;
      // author_association covers org members with private membership (not in listMembers)
      if (pr.author_association === 'MEMBER' || pr.author_association === 'OWNER') continue;
      allPRs.push({
        number: pr.number,
        title: pr.title,
        body: '', // filled by per-PR detail fetch below
        author: pr.user?.login ?? 'unknown',
        labels: pr.labels.map((l) => l.name ?? ''),
        additions: 0, // filled below
        deletions: 0, // filled below
        changedFiles: 0, // filled below
        files: [],
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        headSha: pr.head.sha,
      });
    }

    if (response.data.length < 100) break;
    page++;
  }

  // Fetch per-PR details (additions, deletions, changedFiles, body) in batches of 10
  for (let i = 0; i < allPRs.length; i += 10) {
    const batch = allPRs.slice(i, i + 10);
    await Promise.all(
      batch.map(async (pr) => {
        try {
          const detail = await octokit.rest.pulls.get({
            owner: OWNER,
            repo: REPO,
            pull_number: pr.number,
          });
          pr.additions = detail.data.additions;
          pr.deletions = detail.data.deletions;
          pr.changedFiles = detail.data.changed_files;
          pr.body = detail.data.body ?? '';
        } catch {
          // PR may have been closed between list and detail fetch — keep zero defaults
        }
      })
    );
    if (i + 10 < allPRs.length) await new Promise((r) => setTimeout(r, 1000));
  }

  return allPRs;
}

export async function fetchPR(prNumber: number): Promise<CommunityPR> {
  const { data } = await octokit.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
  });
  return mapPRToCommunityPR(data);
}

export async function fetchPRFiles(prNumber: number): Promise<string[]> {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
    per_page: 100,
  });
  return files.map((f) => f.filename);
}

export async function postComment(prNumber: number, body: string): Promise<void> {
  await octokit.rest.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: prNumber,
    body,
  });
}

export async function fetchOpenPRsWithLabel(labelName: string): Promise<number[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    state: 'open',
    labels: labelName,
    per_page: 100,
  });
  return issues.filter((i) => 'pull_request' in i).map((i) => i.number);
}

// Returns the ISO timestamp of the most recent 'labeled' event for the given label,
// or null if the label was never applied (even if later removed).
export async function getLabelAppliedAt(
  prNumber: number,
  labelName: string
): Promise<string | null> {
  const events = await octokit.paginate(octokit.rest.issues.listEventsForTimeline, {
    owner: OWNER,
    repo: REPO,
    issue_number: prNumber,
    per_page: 100,
  } as Parameters<typeof octokit.rest.issues.listEventsForTimeline>[0]);

  let latest: string | null = null;
  for (const event of events) {
    if (
      event.event === 'labeled' &&
      (event as { event: string; label?: { name: string }; created_at?: string }).label?.name ===
        labelName
    ) {
      const ts = (event as { created_at?: string }).created_at;
      if (ts && (!latest || ts > latest)) latest = ts;
    }
  }
  return latest;
}

export async function addLabel(prNumber: number, labelName: string): Promise<void> {
  await octokit.rest.issues.addLabels({
    owner: OWNER,
    repo: REPO,
    issue_number: prNumber,
    labels: [labelName],
  });
}

export async function removeLabel(prNumber: number, labelName: string): Promise<void> {
  try {
    await octokit.rest.issues.removeLabel({
      owner: OWNER,
      repo: REPO,
      issue_number: prNumber,
      name: labelName,
    });
  } catch (err: unknown) {
    // 404 means label was already removed — safe to ignore
    if ((err as { status?: number }).status !== 404) throw err;
  }
}

export async function closePR(prNumber: number): Promise<void> {
  await octokit.rest.pulls.update({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
    state: 'closed',
  });
}

// Returns true if all commit status checks have passed (covers CLA bot).
// PRs with no status checks (total_count === 0) are treated as passing.
export async function fetchCIStatus(sha: string): Promise<boolean> {
  const { data } = await octokit.rest.repos.getCombinedStatusForRef({
    owner: OWNER,
    repo: REPO,
    ref: sha,
  });
  return data.state === 'success' || data.total_count === 0;
}

export async function appendToPRBody(prNumber: number, appendText: string): Promise<void> {
  const { data } = await octokit.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
  });

  const currentBody = data.body ?? '';

  if (currentBody.includes(appendText)) {
    return;
  }

  const newBody = currentBody + '\n\n---\n' + appendText;

  await octokit.rest.pulls.update({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
    body: newBody,
  });
}
