'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const StrapiChangelogRenderer = require('../changelog-renderer');
const {
  createGitHubLoginLookup,
  loginFromNoreplyEmail,
  resolveContributors,
} = require('../changelog-renderer');

const identity = (name) => name;

const change = (...authors) => ({ authors: authors.map(([name, email]) => ({ name, email })) });

describe('loginFromNoreplyEmail', () => {
  it('reads both noreply forms', () => {
    assert.equal(loginFromNoreplyEmail('nclsndr@users.noreply.github.com'), 'nclsndr');
    assert.equal(loginFromNoreplyEmail('3693028+Adzouz@users.noreply.github.com'), 'Adzouz');
  });

  it('returns null for any other address', () => {
    assert.equal(loginFromNoreplyEmail('ben.irvin@strapi.io'), null);
  });
});

describe('createGitHubLoginLookup', () => {
  it('asks the repository commits filtered by author email, with the token', async () => {
    const calls = [];
    const fetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => [{ author: { login: 'innerdvations' } }] };
    };

    const lookup = createGitHubLoginLookup({
      apiBaseUrl: 'https://api.github.com',
      slug: 'strapi/strapi',
      token: 'secret',
      fetch,
    });

    assert.equal(await lookup('ben+x@strapi.io'), 'innerdvations');
    assert.equal(
      calls[0].url,
      'https://api.github.com/repos/strapi/strapi/commits?author=ben%2Bx%40strapi.io&per_page=1'
    );
    assert.equal(calls[0].init.headers.authorization, 'Bearer secret');
  });

  it('returns null when the commit is not linked to an account', async () => {
    const fetch = async () => ({ ok: true, json: async () => [{ author: null }] });
    const lookup = createGitHubLoginLookup({ apiBaseUrl: 'x', slug: 'a/b', token: '', fetch });

    assert.equal(await lookup('someone@example.com'), null);
  });

  it('throws on a non-ok answer', async () => {
    const fetch = async () => ({ ok: false, status: 403 });
    const lookup = createGitHubLoginLookup({ apiBaseUrl: 'x', slug: 'a/b', token: 't', fetch });

    await assert.rejects(lookup('someone@example.com'), /403/);
  });
});

describe('resolveContributors', () => {
  it('maps noreply emails without a lookup and other emails through the lookup', async () => {
    const looked = [];
    const contributors = await resolveContributors(
      [
        change(['Adrien L', '3693028+Adzouz@users.noreply.github.com']),
        change(['Ben Irvin', 'ben.irvin@strapi.io']),
      ],
      {
        formatName: identity,
        lookupLogin: async (email) => {
          looked.push(email);
          return 'innerdvations';
        },
      }
    );

    assert.deepEqual(looked, ['ben.irvin@strapi.io']);
    assert.deepEqual(contributors, [
      { name: 'Adrien L', login: 'Adzouz' },
      { name: 'Ben Irvin', login: 'innerdvations' },
    ]);
  });

  it('lists one contributor per login, keeping the first name seen', async () => {
    const logins = { 'elabbassih@gmail.com': 'HichamELBSI', 'h@strapi.io': 'hichamelbsi' };
    const contributors = await resolveContributors(
      [
        change(['HichamELBSI', 'elabbassih@gmail.com']),
        change(['ELABBASSI Hicham', 'h@strapi.io']),
      ],
      { formatName: identity, lookupLogin: async (email) => logins[email] }
    );

    assert.deepEqual(contributors, [{ name: 'HichamELBSI', login: 'HichamELBSI' }]);
  });

  it('drops a name-only entry when the same name resolved under another email', async () => {
    const contributors = await resolveContributors(
      [
        change(['Simon Norris', 'simon.norris@strapi.io']),
        change(['Simon Norris', '104358430+cache-your-dreams@users.noreply.github.com']),
      ],
      { formatName: identity, lookupLogin: async () => null }
    );

    assert.deepEqual(contributors, [{ name: 'Simon Norris', login: 'cache-your-dreams' }]);
  });

  it('keeps the author by name when the lookup fails, and reports the failure', async () => {
    const failures = [];
    const contributors = await resolveContributors([change(['Dex', 'dex@example.com'])], {
      formatName: identity,
      lookupLogin: async () => {
        throw new Error('rate limited');
      },
      onLookupError: (email) => failures.push(email),
    });

    assert.deepEqual(contributors, [{ name: 'Dex', login: null }]);
    assert.deepEqual(failures, ['dex@example.com']);
  });

  it('does not look anything up when lookup is disabled', async () => {
    const contributors = await resolveContributors([change(['Dex', 'dex@example.com'])], {
      formatName: identity,
      lookupLogin: null,
    });

    assert.deepEqual(contributors, [{ name: 'Dex', login: null }]);
  });

  it('skips bots, by name or by login, and changes without authors', async () => {
    const contributors = await resolveContributors(
      [
        change(['dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com']),
        change(['Renovate', 'bot@renovateapp.com']),
        {},
      ],
      { formatName: identity, lookupLogin: async () => 'renovate[bot]' }
    );

    assert.deepEqual(contributors, []);
  });
});

describe('StrapiChangelogRenderer', () => {
  it('renders the Thank You section with GitHub logins', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [{ author: { login: 'innerdvations' } }],
    });

    try {
      const renderer = new StrapiChangelogRenderer({
        changes: [
          {
            type: 'fix',
            scope: 'core',
            description: 'close remaining clone relation edge cases',
            affectedProjects: '*',
            authors: [{ name: 'Ben Irvin', email: 'ben.irvin@strapi.io' }],
            githubReferences: [],
            shortHash: 'abc1234',
          },
        ],
        changelogEntryVersion: '5.59.0',
        project: null,
        entryWhenNoChanges: false,
        isVersionPlans: false,
        changelogRenderOptions: { authors: true, versionTitleDate: false },
        repoData: {
          hostname: 'github.com',
          slug: 'strapi/strapi',
          apiBaseUrl: 'https://api.github.com',
        },
        conventionalCommitsConfig: { types: { fix: { changelog: { title: 'Bug fix' } } } },
      });

      const markdown = await renderer.render();

      assert.match(markdown, /### ❤️ Thank You\n\n- Ben Irvin @innerdvations$/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
