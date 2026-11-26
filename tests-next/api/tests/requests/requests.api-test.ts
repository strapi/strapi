import type { UID } from '@strapi/types';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  documents,
  queryDb,
  scaffoldContentType,
  stopAllServers,
  TestDataError,
  type Server,
} from '@strapi/tests-shared';

import {
  createAdminClient,
  createContentAPIClient,
  createWebhookReceiver,
  request,
  setupApp,
  SUPER_ADMIN,
  toQueryString,
  userLogin,
  type TestApp,
  type WebhookReceiver,
} from '../helpers';

/**
 * The request helpers a migrated API test uses in place of `createAuthRequest`,
 * `createContentAPIRequest`, `strapi.db.query`, `strapi.documents` and `strapi.eventHub`:
 * real logins and tokens against a server in another process.
 */

const ARTICLE: UID.ContentType = 'api::article.article';
const EDITOR = {
  email: 'editor@test.io',
  password: 'Testing123!',
  firstname: 'Ed',
  lastname: 'Itor',
  roles: ['strapi-editor'],
};
const READER = { username: 'reader', email: 'reader@test.io', password: 'Testing123!' };
// Plain text: Strapi stores it as sent (images get optimized).
const TEXT_FILE = Buffer.from('Uploaded by a test.\n');

let ctx: TestApp;
let server: Server;
const token = (name: string) => ctx.seeded.apiTokens.find((t) => t.name === name)!.accessKey;

beforeAll(async () => {
  ctx = await setupApp({
    name: 'requests',
    scaffold(app) {
      scaffoldContentType(app, {
        singularName: 'article',
        draftAndPublish: false,
        attributes: { title: { type: 'string' } },
      });
    },
    seed: {
      adminUsers: [SUPER_ADMIN, EDITOR],
      users: [READER],
      entries: ['Alpha', 'Beta'].map((title) => ({ uid: ARTICLE, data: { title } })),
      apiTokens: [
        { name: 'read-only', type: 'read-only' },
        { name: 'full-access', type: 'full-access' },
      ],
    },
  });
  server = ctx.server;
});

afterAll(async () => {
  await stopAllServers();
});

describe('admin client', () => {
  test('logs in with a real session, and the role permissions apply', async () => {
    const admin = await createAdminClient(server, SUPER_ADMIN);
    const editor = await createAdminClient(server, EDITOR);

    expect(editor.user.email).toBe(EDITOR.email);
    expect((await editor.get('/admin/users/me')).status).toBe(200);

    // Admin users are super admin only: the editor role has no admin::users.read.
    expect((await admin.get('/admin/users')).status).toBe(200);
    const forbidden = await editor.get('/admin/users');
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.name).toBe('PolicyError');

    // The editor can read the content it manages.
    const list = await editor.get(`/content-manager/collection-types/${ARTICLE}`);
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(2);
  });

  test('fails on a wrong password', async () => {
    await expect(createAdminClient(server, { ...EDITOR, password: 'wrong' })).rejects.toThrow(
      /Admin login of editor@test.io failed: 400/
    );
  });
});

describe('content API client', () => {
  test('a read-only token reads and cannot write', async () => {
    const api = createContentAPIClient(server, { token: token('read-only') });

    const list = await api.get('/articles');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);

    const create = await api.post('/articles', { body: { data: { title: 'Nope' } } });
    expect(create.status).toBe(403);
  });

  test('a full-access token writes', async () => {
    const api = createContentAPIClient(server, { token: token('full-access') });

    const create = await api.post('/articles', { body: { data: { title: 'Gamma' } } });
    expect(create.status).toBe(201);
    expect(create.body.data.title).toBe('Gamma');

    expect((await api.delete(`/articles/${create.body.data.documentId}`)).status).toBe(204);
  });

  test('nothing bypasses the auth: no token is the public role, which has no permission', async () => {
    const res = await createContentAPIClient(server).get('/articles');
    expect(res.status).toBe(403);
  });

  test('a Users & Permissions JWT authenticates as the user', async () => {
    const { jwt, user } = await userLogin(server, {
      identifier: READER.email,
      password: READER.password,
    });
    expect(user.email).toBe(READER.email);

    const me = await createContentAPIClient(server, { token: jwt }).get('/users/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(READER.email);
  });

  test('query strings use the bracket format Strapi parses', async () => {
    const api = createContentAPIClient(server, { token: token('read-only') });

    const res = await api.get('/articles', {
      query: { filters: { title: { $eq: 'Beta' } }, fields: ['title'] },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.map((article: { title: string }) => article.title)).toEqual(['Beta']);
  });

  test('query is appended to a query string the path already has', async () => {
    const api = createContentAPIClient(server, { token: token('read-only') });

    const res = await api.get('/articles?pagination[pageSize]=10', {
      query: { filters: { title: { $eq: 'Beta' } } },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.map((article: { title: string }) => article.title)).toEqual(['Beta']);
    expect(res.body.meta.pagination.pageSize).toBe(10);
  });
});

describe('request options', () => {
  // An HTTP server that records what it receives: `request()` only reads `url`.
  let echo: WebhookReceiver;

  beforeAll(async () => {
    echo = await createWebhookReceiver();
  });

  afterAll(async () => {
    await echo?.close();
  });

  test('a per-call Authorization replaces the token, whatever its case', async () => {
    await request(echo, '/', {
      token: 'client-token',
      headers: { Authorization: 'Bearer per-call' },
    });
    expect(echo.calls.at(-1)!.headers.authorization).toBe('Bearer per-call');

    const admin = await createAdminClient(server, SUPER_ADMIN);
    const same = await admin.get('/admin/users/me', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(same.status).toBe(200);

    // 401 for the per-call token, not for two joined tokens.
    const other = await admin.get('/admin/users/me', {
      headers: { Authorization: 'Bearer not-a-token' },
    });
    expect(other.status).toBe(401);
  });

  test('a per-call Content-Type replaces the JSON default, whatever its case', async () => {
    await request(echo, '/', {
      method: 'POST',
      body: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(echo.calls.at(-1)!.headers['content-type']).toBe('application/json');

    const api = createContentAPIClient(server, { token: token('full-access') });
    const create = await api.post('/articles', {
      body: { data: { title: 'Typed' } },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(create.status).toBe(201);
    expect((await api.delete(`/articles/${create.body.data.documentId}`)).status).toBe(204);
  });

  test('custom headers reach the server', async () => {
    await request(echo, '/', { headers: { 'X-Test-Header': 'hello' } });
    expect(echo.calls.at(-1)!.headers['x-test-header']).toBe('hello');
  });

  test('the response headers come back', async () => {
    const res = await createContentAPIClient(server, { token: token('read-only') }).get(
      '/articles'
    );
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
  });

  test('formData sends a multipart upload', async () => {
    const api = createContentAPIClient(server, { token: token('full-access') });
    const formData = new FormData();
    formData.append('files', new Blob([TEXT_FILE], { type: 'text/plain' }), 'note.txt');

    const upload = await api.post('/upload', { formData });
    expect(upload.status).toBe(201);
    const [file] = upload.body;
    expect(file).toMatchObject({ name: 'note.txt', mime: 'text/plain' });

    // The file is stored and served.
    const served = await fetch(`${server.url}${file.url}`);
    expect(served.status).toBe(200);
    expect(Buffer.from(await served.arrayBuffer()).equals(TEXT_FILE)).toBe(true);
  });
});

describe('toQueryString', () => {
  test('nested objects and arrays', () => {
    expect(
      decodeURIComponent(
        toQueryString({
          filters: { $or: [{ title: { $eq: 'a b' } }, { id: { $in: [1, 2] } }] },
          sort: ['title:asc'],
          pagination: { page: 1 },
          skipped: undefined,
          empty: null,
        })
      )
    ).toBe(
      [
        'filters[$or][0][title][$eq]=a+b',
        'filters[$or][1][id][$in][0]=1',
        'filters[$or][1][id][$in][1]=2',
        'sort[0]=title:asc',
        'pagination[page]=1',
        'empty=',
      ].join('&')
    );
  });
});

describe('data access in the server', () => {
  test('documents() and queryDb() run in the server', async () => {
    // Counts relative to this test's own data: other tests may leave articles behind.
    const before = await documents<number>(server, ARTICLE, 'count');
    const created = await documents<{ documentId: string; title: string }>(
      server,
      ARTICLE,
      'create',
      { data: { title: 'From documents()' } }
    );
    expect(created.title).toBe('From documents()');

    // What the server wrote is what the API serves.
    const admin = await createAdminClient(server, SUPER_ADMIN);
    const read = await admin.get(
      `/content-manager/collection-types/${ARTICLE}/${created.documentId}`
    );
    expect(read.body.data.title).toBe('From documents()');

    expect(
      await queryDb<number>(server, ARTICLE, 'count', { where: { title: 'From documents()' } })
    ).toBe(1);
    // An internal content type no route lists.
    const users = await queryDb<Array<{ email: string }>>(server, 'admin::user', 'findMany', {
      select: ['email'],
      orderBy: { email: 'asc' },
    });
    expect(users.map((user) => user.email)).toEqual([SUPER_ADMIN.email, EDITOR.email].sort());

    // findOne misses are null, not an empty body.
    expect(await queryDb(server, ARTICLE, 'findOne', { where: { title: 'none' } })).toBeNull();

    await documents(server, ARTICLE, 'delete', { documentId: created.documentId });
    expect(await documents(server, ARTICLE, 'count')).toBe(before);
  });

  test('errors come back with their name', async () => {
    await expect(queryDb(server, 'api::missing.missing', 'findMany')).rejects.toThrow(
      /Unknown model "api::missing.missing"/
    );

    await expect(
      // @ts-expect-error not an allowed method
      queryDb(server, ARTICLE, 'deleteAll')
    ).rejects.toThrow(/Unsupported method "deleteAll"/);

    const error = await documents(server, ARTICLE, 'create', {
      data: { title: { not: 'a string' } },
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TestDataError);
    expect((error as TestDataError).name).toBe('ValidationError');
  });
});

describe('webhook receiver', () => {
  let receiver: WebhookReceiver;

  beforeAll(async () => {
    receiver = await createWebhookReceiver();
  });

  afterAll(async () => {
    await receiver?.close();
  });

  test('records the webhooks Strapi sends', async () => {
    const admin = await createAdminClient(server, SUPER_ADMIN);
    const webhook = await admin.post('/admin/webhooks', {
      body: { name: 'receiver', url: receiver.url, headers: {}, events: ['entry.create'] },
    });
    expect(webhook.status).toBe(201);

    const api = createContentAPIClient(server, { token: token('full-access') });
    const created = await api.post('/articles', { body: { data: { title: 'Hooked' } } });

    await vi.waitFor(() => expect(receiver.callsFor('entry.create')).toHaveLength(1), {
      timeout: 10_000,
    });
    const [call] = receiver.callsFor('entry.create');
    expect(call.body).toMatchObject({
      event: 'entry.create',
      uid: ARTICLE,
      entry: { documentId: created.body.data.documentId, title: 'Hooked' },
    });
  });
});
