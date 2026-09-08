import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createGithubAdapter, createRestClient, parseNextLink } from '../lib/github.ts';

import type { HttpRequest, HttpResponse } from '../lib/github.ts';

type Call = {
  url: string;
  method: string;
  body: string | undefined;
  headers: Record<string, string>;
};

function response(overrides: Partial<HttpResponse> & { payload?: unknown } = {}): HttpResponse {
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    headers: overrides.headers ?? { get: () => null },
    json: overrides.json ?? (async () => overrides.payload ?? {}),
    text: overrides.text ?? (async () => JSON.stringify(overrides.payload ?? {})),
  };
}

function stubRequest(responses: HttpResponse[]): { request: HttpRequest; calls: Call[] } {
  const calls: Call[] = [];
  let index = 0;

  return {
    calls,
    async request(url, init) {
      calls.push({ url, method: init.method, body: init.body, headers: init.headers });
      const next = responses[index] ?? response();
      index += 1;

      return next;
    },
  };
}

describe('parseNextLink', () => {
  it('finds the next cursor', () => {
    const header =
      '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=9>; rel="last"';

    assert.equal(parseNextLink(header), 'https://api.github.com/x?page=2');
  });

  it('returns null on the last page', () => {
    assert.equal(parseNextLink('<https://api.github.com/x?page=1>; rel="prev"'), null);
  });

  it('returns null when there is no header at all', () => {
    assert.equal(parseNextLink(null), null);
    assert.equal(parseNextLink(''), null);
  });
});

describe('createRestClient', () => {
  it('authenticates and pins the API version', async () => {
    const { request, calls } = stubRequest([response({ payload: { ok: true } })]);

    await createRestClient('secret-token', request).get('/repos/strapi/strapi');

    assert.equal(calls[0]?.url, 'https://api.github.com/repos/strapi/strapi');
    assert.equal(calls[0]?.headers['authorization'], 'Bearer secret-token');
    assert.equal(calls[0]?.headers['x-github-api-version'], '2022-11-28');
  });

  it('serialises a body for a write', async () => {
    const { request, calls } = stubRequest([response()]);

    await createRestClient('t', request).send('PATCH', '/repos/a/b/milestones/1', {
      title: '5.53.0',
    });

    assert.equal(calls[0]?.method, 'PATCH');
    assert.equal(calls[0]?.body, '{"title":"5.53.0"}');
  });

  it('surfaces the API message on a failure', async () => {
    const { request } = stubRequest([
      response({ ok: false, status: 401, payload: { message: 'Bad credentials' } }),
    ]);

    await assert.rejects(
      () => createRestClient('t', request).get('/repos/a/b'),
      /GitHub GET \/repos\/a\/b failed: 401 Bad credentials/u
    );
  });

  it('carries the response status on the error, so the journal can tell a refusal apart', async () => {
    const { request } = stubRequest([
      response({ ok: false, status: 422, payload: { message: 'already_exists' } }),
    ]);

    await assert.rejects(
      () => createRestClient('t', request).send('PATCH', '/repos/a/b/milestones/430', {}),
      (error: unknown) => (error as { status?: unknown }).status === 422
    );
  });

  it('surfaces a non-JSON failure body verbatim', async () => {
    const { request } = stubRequest([
      response({ ok: false, status: 502, text: async () => 'bad gateway' }),
    ]);

    await assert.rejects(() => createRestClient('t', request).get('/x'), /502 bad gateway/u);
  });

  it('follows the server cursor until it stops offering one', async () => {
    const { request, calls } = stubRequest([
      response({
        payload: [{ number: 1 }],
        headers: { get: () => '<https://api.github.com/next-page>; rel="next"' },
      }),
      response({ payload: [{ number: 2 }] }),
    ]);

    const items = await createRestClient('t', request).paginate('/repos/a/b/milestones');

    assert.deepEqual(items, [{ number: 1 }, { number: 2 }]);
    assert.deepEqual(
      calls.map((call) => call.url),
      ['https://api.github.com/repos/a/b/milestones', 'https://api.github.com/next-page']
    );
  });
});

describe('createGithubAdapter', () => {
  const coords = { owner: 'strapi', repo: 'strapi' };

  it('asks for the pull requests associated with a commit', async () => {
    const { request, calls } = stubRequest([response({ payload: [] })]);

    await createGithubAdapter('t', coords, request).listPullsForCommit('abc');

    assert.equal(
      calls[0]?.url,
      'https://api.github.com/repos/strapi/strapi/commits/abc/pulls?per_page=100'
    );
  });

  it('asks for every milestone item in any state', async () => {
    const { request, calls } = stubRequest([response({ payload: [] })]);

    await createGithubAdapter('t', coords, request).listMilestoneItems(430);

    assert.match(calls[0]?.url ?? '', /\/issues\?milestone=430&state=all&per_page=100$/u);
  });

  it('opens the release pull request as a draft', async () => {
    const { request, calls } = stubRequest([response({ payload: { number: 1 } })]);

    await createGithubAdapter('t', coords, request).createPull({
      head: 'releases/5.53.0',
      base: 'main',
      title: 'Release 5.53.0',
      body: 'x',
    });

    assert.equal(JSON.parse(calls[0]?.body ?? '{}').draft, true);
  });

  it('clears a milestone by sending null', async () => {
    const { request, calls } = stubRequest([response()]);

    await createGithubAdapter('t', coords, request).setIssueMilestone(27601, null);

    assert.equal(calls[0]?.body, '{"milestone":null}');
  });

  it('adds labels through the labels endpoint', async () => {
    const { request, calls } = stubRequest([response({ payload: [] })]);

    await createGithubAdapter('t', coords, request).addLabels(27700, ['publish-experimental']);

    assert.match(calls[0]?.url ?? '', /\/issues\/27700\/labels$/u);
    assert.equal(calls[0]?.body, '{"labels":["publish-experimental"]}');
  });

  it('lists the pull requests open against one base', async () => {
    const { request, calls } = stubRequest([response({ payload: [] })]);

    await createGithubAdapter('t', coords, request).listPulls({ state: 'open', base: 'main' });

    assert.match(calls[0]?.url ?? '', /\/pulls\?state=open&base=main&per_page=100$/u);
  });

  it('closes a pull request without touching its body', async () => {
    const { request, calls } = stubRequest([response({ payload: { number: 27600 } })]);

    await createGithubAdapter('t', coords, request).closePull(27600);

    assert.match(calls[0]?.url ?? '', /\/pulls\/27600$/u);
    assert.equal(calls[0]?.method, 'PATCH');
    assert.equal(calls[0]?.body, '{"state":"closed"}');
  });
});
