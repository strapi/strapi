import type { GithubAdapter, RepositoryCoords } from './types.ts';

/**
 * The GitHub surface this action needs, over plain `fetch`.
 *
 * Octokit is not a dependency, because a dependency would force this action to ship a committed
 * bundle. What is left is a dozen REST calls and `Link`-header pagination, and every decision still
 * lives in a pure module: this file only moves bytes.
 */

const API_ROOT = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const PAGE_SIZE = 100;

/** The minimum of the fetch response shape this client reads. */
export type HttpResponse = {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export type HttpRequest = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<HttpResponse>;

/**
 * Reads the next page URL out of a `Link` header.
 *
 * Following the server's own cursor is the only correct way to page the GitHub API: the parameters
 * it embeds are not always reproducible by incrementing `page`.
 *
 * @returns `null` on the last page.
 */
export function parseNextLink(header: string | null): string | null {
  if (header === null || header === '') {
    return null;
  }

  const next = header
    .split(',')
    .map((part) => /<([^>]+)>\s*;\s*rel="([^"]+)"/u.exec(part.trim()))
    .find((match) => match !== null && match[2] === 'next');

  return next?.[1] ?? null;
}

/**
 * A failure the server answered.
 *
 * The status travels on the error so the write journal can tell a refused mutation from one whose
 * outcome nobody can vouch for. See `classifyFailure` in [`journal.ts`](journal.ts).
 */
function answeredFailure(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

async function describeFailure(response: HttpResponse): Promise<string> {
  const body = await response.text().catch(() => '');

  try {
    const parsed: unknown = JSON.parse(body);
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : body;

    return `${response.status} ${message}`;
  } catch {
    return `${response.status} ${body}`;
  }
}

/** Builds the authenticated REST client the adapter runs on. */
export function createRestClient(token: string, request: HttpRequest) {
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': API_VERSION,
    'user-agent': 'strapi-draft-release-action',
    'content-type': 'application/json',
  };

  async function call(method: string, url: string, body?: unknown): Promise<HttpResponse> {
    const response = await request(url.startsWith('http') ? url : `${API_ROOT}${url}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (response.ok === false) {
      throw answeredFailure(
        `GitHub ${method} ${url} failed: ${await describeFailure(response)}`,
        response.status
      );
    }

    return response;
  }

  return {
    async get<T>(path: string): Promise<T> {
      return (await (await call('GET', path)).json()) as T;
    },

    async send<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
      return (await (await call(method, path, body)).json()) as T;
    },

    /** Follows `Link: rel="next"` until the server stops offering one. */
    async paginate<T>(path: string): Promise<T[]> {
      const items: T[] = [];
      let url: string | null = path;

      // Sequential by necessity: each page URL is only known once the previous page returns.
      while (url !== null) {
        const response: HttpResponse = await call('GET', url);
        items.push(...((await response.json()) as T[]));
        url = parseNextLink(response.headers.get('link'));
      }

      return items;
    },
  };
}

function query(parameters: Record<string, string>): string {
  return new URLSearchParams({ ...parameters, per_page: String(PAGE_SIZE) }).toString();
}

export function createGithubAdapter(
  token: string,
  coords: RepositoryCoords,
  request: HttpRequest
): GithubAdapter {
  const rest = createRestClient(token, request);
  const base = `/repos/${coords.owner}/${coords.repo}`;

  return {
    coords,

    async getRepository() {
      return rest.get(base);
    },

    async listPullsForCommit(sha) {
      return rest.get(`${base}/commits/${sha}/pulls?${query({})}`);
    },

    async getPull(pullNumber) {
      return rest.get(`${base}/pulls/${pullNumber}`);
    },

    /**
     * Pull requests against one base branch. Paged, because the candidate is found by head ref and
     * a run that stops at the first page could miss it behind unrelated pull requests.
     */
    async listPulls({ state, base: baseRef }) {
      return rest.paginate(`${base}/pulls?${query({ state, base: baseRef })}`);
    },

    async listPullCommits(pullNumber) {
      return rest.paginate(`${base}/pulls/${pullNumber}/commits?${query({})}`);
    },

    /**
     * Paged on purpose. The repository carries hundreds of closed milestones, and an unpaged read
     * would report a real milestone as missing.
     */
    async listMilestones(state) {
      return rest.paginate(`${base}/milestones?${query({ state })}`);
    },

    async createMilestone(title) {
      return rest.send('POST', `${base}/milestones`, { title });
    },

    async updateMilestone(milestoneNumber, patch) {
      return rest.send('PATCH', `${base}/milestones/${milestoneNumber}`, patch);
    },

    /**
     * Issues and pull requests carrying a milestone, in any state. The issues endpoint returns
     * pull requests too, distinguishable by the `pull_request` key.
     */
    async listMilestoneItems(milestoneNumber) {
      return rest.paginate(
        `${base}/issues?${query({ milestone: String(milestoneNumber), state: 'all' })}`
      );
    },

    async setIssueMilestone(issueNumber, milestoneNumber) {
      await rest.send('PATCH', `${base}/issues/${issueNumber}`, { milestone: milestoneNumber });
    },

    async createPull(input) {
      return rest.send('POST', `${base}/pulls`, { ...input, draft: true });
    },

    async updatePullBody(pullNumber, body) {
      await rest.send('PATCH', `${base}/pulls/${pullNumber}`, { body });
    },

    async closePull(pullNumber) {
      await rest.send('PATCH', `${base}/pulls/${pullNumber}`, { state: 'closed' });
    },

    async addLabels(issueNumber, labels) {
      await rest.send('POST', `${base}/issues/${issueNumber}/labels`, { labels });
    },

    async createComment(issueNumber, body) {
      await rest.send('POST', `${base}/issues/${issueNumber}/comments`, { body });
    },
  };
}
