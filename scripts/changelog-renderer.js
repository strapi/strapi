'use strict';

const DefaultChangelogRenderer = require('nx/release/changelog-renderer').default;

const NOREPLY_EMAIL = /^(\d+\+)?([^@]+)@users\.noreply\.github\.com$/;

/**
 * Reads the login out of a GitHub noreply address, `login@…` or `1234567+login@…`.
 *
 * @param {string} email
 * @returns {string | null}
 */
const loginFromNoreplyEmail = (email) => {
  const match = email.match(NOREPLY_EMAIL);

  return match === null ? null : match[2];
};

/**
 * Asks GitHub which account authored commits with this email in the repository.
 *
 * nx's default renderer asks ungh.cc instead: an unauthenticated third-party service that answers
 * 429 under load, which leaves every author without a noreply email unmapped.
 *
 * @param {{ apiBaseUrl: string, slug: string, token: string | undefined, fetch?: typeof fetch }} options
 * @returns {(email: string) => Promise<string | null>}
 */
const createGitHubLoginLookup = ({ apiBaseUrl, slug, token, fetch = globalThis.fetch }) => {
  return async (email) => {
    const url = `${apiBaseUrl}/repos/${slug}/commits?author=${encodeURIComponent(email)}&per_page=1`;
    const headers = { accept: 'application/vnd.github+json' };

    if (token !== undefined && token !== '') {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (response.ok === false) {
      throw new Error(`GitHub answered ${response.status} for ${url}`);
    }

    const commits = await response.json();
    const login = commits[0]?.author?.login;

    return typeof login === 'string' && login !== '' ? login : null;
  };
};

/**
 * Groups the authors of the changes into contributors, one per GitHub account when it is known.
 *
 * A person who committed under several names or emails is listed once when GitHub maps them to the
 * same login; the first name seen is kept. A failed lookup never fails the release: the author is
 * listed by name only.
 *
 * @param {Array<{ authors?: Array<{ name: string, email: string }> }>} changes
 * @param {{ formatName: (name: string) => string, lookupLogin: ((email: string) => Promise<string | null>) | null, onLookupError?: (email: string, error: unknown) => void }} options
 * @returns {Promise<Array<{ name: string, login: string | null }>>}
 */
const resolveContributors = async (changes, { formatName, lookupLogin, onLookupError }) => {
  /** @type {Map<string, string>} email -> first formatted name seen with it */
  const nameByEmail = new Map();

  for (const change of changes) {
    if (change.authors === undefined) {
      continue;
    }

    for (const author of change.authors) {
      const name = formatName(author.name);

      if (name === '' || name.includes('[bot]') === true || nameByEmail.has(author.email)) {
        continue;
      }

      nameByEmail.set(author.email, name);
    }
  }

  const resolved = await Promise.all(
    [...nameByEmail.entries()].map(async ([email, name]) => {
      let login = loginFromNoreplyEmail(email);

      if (login === null && lookupLogin !== null) {
        try {
          login = await lookupLogin(email);
        } catch (error) {
          onLookupError?.(email, error);
        }
      }

      return { name, login };
    })
  );

  /** @type {Map<string, { name: string, login: string | null }>} */
  const contributors = new Map();

  for (const { name, login } of resolved) {
    if (login !== null && login.endsWith('[bot]') === true) {
      continue;
    }

    const key = login === null ? `name:${name}` : `login:${login.toLowerCase()}`;

    if (contributors.has(key) === false) {
      contributors.set(key, { name, login });
    }
  }

  // An author whose name-only entry matches a resolved contributor's name is the same person
  for (const [key, contributor] of contributors) {
    if (contributor.login !== null) {
      continue;
    }

    const hasResolvedTwin = [...contributors.values()].some(
      (other) => other.login !== null && other.name === contributor.name
    );

    if (hasResolvedTwin === true) {
      contributors.delete(key);
    }
  }

  return [...contributors.values()].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * nx's default changelog renderer, with the "Thank You" section resolved through the GitHub API.
 *
 * Wired in `nx.json` under `release.changelog.workspaceChangelog.renderer`.
 */
class StrapiChangelogRenderer extends DefaultChangelogRenderer {
  async renderAuthors() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const mapToGitHub =
      this.repoData !== undefined &&
      this.repoData !== null &&
      this.changelogRenderOptions.mapAuthorsToGitHubUsernames !== false;

    const contributors = await resolveContributors(
      [...this.relevantChanges, ...this.additionalChangesForAuthorsSection],
      {
        formatName: (name) => this.formatName(name),
        lookupLogin:
          mapToGitHub === true
            ? createGitHubLoginLookup({
                apiBaseUrl: this.repoData.apiBaseUrl,
                slug: this.repoData.slug,
                token,
              })
            : null,
        onLookupError: (email, error) => {
          console.warn(`Could not map ${email} to a GitHub login: ${error.message ?? error}`);
        },
      }
    );

    if (contributors.length === 0) {
      return [];
    }

    return [
      '',
      '### ❤️ Thank You',
      '',
      ...contributors.map(({ name, login }) => `- ${name}${login === null ? '' : ` @${login}`}`),
    ];
  }
}

module.exports = StrapiChangelogRenderer;
module.exports.default = StrapiChangelogRenderer;
module.exports.loginFromNoreplyEmail = loginFromNoreplyEmail;
module.exports.createGitHubLoginLookup = createGitHubLoginLookup;
module.exports.resolveContributors = resolveContributors;
