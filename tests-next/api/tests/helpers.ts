import http from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  appPort,
  databaseFromEnv,
  generateApp,
  resetDatabase,
  seedApp,
  startServer,
  type App,
  type Database,
  type SeedPlan,
  type SeedResult,
  type Server,
} from '@strapi/tests-shared';

/** Vitest worker of this file (1-based), for app names and ports that don't collide. */
export const worker = Number(process.env.VITEST_POOL_ID ?? 1);

export const port = appPort('api', worker - 1);

/* -------------------------------------------------------------------------------------------------
 * Requests
 * -----------------------------------------------------------------------------------------------*/

export interface Response {
  status: number;
  headers: Headers;
  // The tests read the bodies they expect: typing every route is not worth it here.
  body: any;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
  /** JSON body. */
  body?: unknown;
  /** Multipart body (uploads). Takes precedence over `body`. */
  formData?: FormData;
  /** Query string, in Strapi's bracket format: `{ filters: { title: { $eq: 'a' } } }`. */
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * `{ filters: { title: { $eq: 'a' } }, sort: ['title'] }` to
 * `filters[title][$eq]=a&sort[0]=title`, like `qs.stringify` (what Strapi parses).
 */
export const toQueryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  const add = (key: string, value: unknown) => {
    if (value === undefined) {
      return;
    }
    if (value === null) {
      params.append(key, '');
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => add(`${key}[${index}]`, item));
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      for (const [child, item] of Object.entries(value)) {
        add(`${key}[${child}]`, item);
      }
    } else {
      params.append(key, value instanceof Date ? value.toISOString() : String(value));
    }
  };
  for (const [key, value] of Object.entries(query)) {
    add(key, value);
  }
  return params.toString();
};

/** A request to a test server. The body is parsed as JSON when it is JSON. */
export const request = async (
  server: Server,
  path: string,
  { method = 'GET', token, body, formData, query, headers = {} }: RequestOptions = {}
): Promise<Response> => {
  const search = query ? toQueryString(query) : '';
  const res = await fetch(`${server.url}${path}${search ? `?${search}` : ''}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined || formData ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: keep the text
  }
  return { status: res.status, headers: res.headers, body: parsed };
};

type ClientRequestOptions = Omit<RequestOptions, 'method'>;

/**
 * Requests that share a token and a path prefix. Replaces `createAgent` and the `rq` of the old
 * API tests (tests/api), on a server in another process: no supertest, plain `fetch`.
 */
export interface Client {
  server: Server;
  token?: string;
  prefix: string;
  request: (path: string, options?: RequestOptions) => Promise<Response>;
  get: (path: string, options?: ClientRequestOptions) => Promise<Response>;
  post: (path: string, options?: ClientRequestOptions) => Promise<Response>;
  put: (path: string, options?: ClientRequestOptions) => Promise<Response>;
  patch: (path: string, options?: ClientRequestOptions) => Promise<Response>;
  delete: (path: string, options?: ClientRequestOptions) => Promise<Response>;
}

export const createClient = (
  server: Server,
  { token, prefix = '' }: { token?: string; prefix?: string } = {}
): Client => {
  const send = (path: string, options: RequestOptions = {}) =>
    request(server, `${prefix}${path}`, { token, ...options });
  const shorthand =
    (method: Method) =>
    (path: string, options: ClientRequestOptions = {}) =>
      send(path, { ...options, method });

  return {
    server,
    token,
    prefix,
    request: send,
    get: shorthand('GET'),
    post: shorthand('POST'),
    put: shorthand('PUT'),
    patch: shorthand('PATCH'),
    delete: shorthand('DELETE'),
  };
};

/* -------------------------------------------------------------------------------------------------
 * Authentication
 * -----------------------------------------------------------------------------------------------*/

export interface Credentials {
  email: string;
  password: string;
}

/** Log an admin user in through the API (`POST /admin/login`). */
export const adminLoginWithUser = async (server: Server, { email, password }: Credentials) => {
  const res = await request(server, '/admin/login', { method: 'POST', body: { email, password } });
  if (res.status !== 200) {
    throw new Error(`Admin login of ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { token: string; user: { id: number; email: string } };
};

/** Log an admin user in through the API. Returns the access token. */
export const adminLogin = async (server: Server, email: string, password: string) =>
  (await adminLoginWithUser(server, { email, password })).token;

/**
 * Admin API requests as an admin user, with the access token of a real login: the permissions
 * of the user's roles apply. Seed the user first (`adminUsers` of a seed plan). Replaces
 * `createAuthRequest({ strapi, userInfo })`.
 */
export const createAdminClient = async (server: Server, credentials: Credentials) => {
  const { token, user } = await adminLoginWithUser(server, credentials);
  return { ...createClient(server, { token }), user };
};

/**
 * Content API requests (`/api` prefix). With an API token (`accessKey` of a seeded `apiTokens`
 * entry) or the JWT of a Users & Permissions user (`userLogin`), or none for the public role.
 * Replaces `createContentAPIRequest`. Unlike the old suite, nothing bypasses the content API
 * auth: an unauthenticated request gets the public role's permissions.
 */
export const createContentAPIClient = (server: Server, { token }: { token?: string } = {}) =>
  createClient(server, { token, prefix: '/api' });

/** Log a Users & Permissions user in (`POST /api/auth/local`). Returns the JWT and the user. */
export const userLogin = async (
  server: Server,
  { identifier, password }: { identifier: string; password: string }
) => {
  const res = await request(server, '/api/auth/local', {
    method: 'POST',
    body: { identifier, password },
  });
  if (res.status !== 200) {
    throw new Error(`Login of ${identifier} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { jwt: string; user: { id: number; documentId: string; email: string } };
};

/* -------------------------------------------------------------------------------------------------
 * Per-file app
 * -----------------------------------------------------------------------------------------------*/

/** The super admin most files seed, as `SUPER_ADMIN` in their `adminUsers`. */
export const SUPER_ADMIN = {
  email: 'admin@test.io',
  password: 'Testing123!',
  firstname: 'Super',
  lastname: 'Admin',
  roles: ['strapi-super-admin'],
};

export interface SetupAppOptions {
  /** App name, made unique per worker: `api-<name>-<worker>`. */
  name: string;
  /** Write content types, components, config and plugins, before boot (scaffolders). */
  scaffold?: (app: App) => void | Promise<void>;
  /** Data seeded before boot, in one Strapi load. Default: `{ adminUsers: [SUPER_ADMIN] }`. */
  seed?: SeedPlan;
  /** Env of the seed process and the server. */
  env?: NodeJS.ProcessEnv;
  /** Default: the run's database (`TESTS_DATABASE`). */
  database?: Database;
}

export interface TestApp {
  app: App;
  server: Server;
  database: Database;
  seeded: SeedResult;
}

/**
 * The app of a test file: generate, empty its database, scaffold, seed, boot. One Strapi
 * instance per file, and no restart. Stop it in `afterAll` with `stopAllServers()`.
 *
 * ```ts
 * let ctx: TestApp;
 * beforeAll(async () => {
 *   ctx = await setupApp({
 *     name: 'articles',
 *     scaffold: (app) => scaffoldContentType(app, { singularName: 'article', attributes }),
 *     seed: { adminUsers: [SUPER_ADMIN], apiTokens: [{ name: 'read', type: 'read-only' }] },
 *   });
 * });
 * afterAll(stopAllServers);
 * ```
 */
export const setupApp = async ({
  name,
  scaffold,
  seed = { adminUsers: [SUPER_ADMIN] },
  env,
  database = databaseFromEnv(),
}: SetupAppOptions): Promise<TestApp> => {
  const app = await generateApp({ name: `api-${name}-${worker}` });
  await resetDatabase(app, database);
  await scaffold?.(app);
  const seeded = await seedApp(app, seed, { database, env });
  const server = await startServer(app, { port, database, env });
  return { app, server, database, seeded };
};

/* -------------------------------------------------------------------------------------------------
 * Webhooks
 * -----------------------------------------------------------------------------------------------*/

export interface WebhookCall {
  headers: http.IncomingHttpHeaders;
  body: any;
}

export interface WebhookReceiver {
  /** Give it as the webhook url. */
  url: string;
  calls: WebhookCall[];
  /** Calls whose `event` is this one. */
  callsFor: (event: string) => WebhookCall[];
  close: () => Promise<void>;
}

/**
 * An HTTP server in the test process that records the webhooks Strapi sends it: what a test of
 * the old suite read with `strapi.eventHub.on()`. Create the webhook through the admin API
 * (`POST /admin/webhooks`), which registers it without a restart. Deliveries are asynchronous:
 * wait with `vi.waitFor()`. Close it in `afterAll`, or the test process keeps a handle open.
 */
export const createWebhookReceiver = async (): Promise<WebhookReceiver> => {
  const calls: WebhookCall[] = [];
  const receiver = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // not JSON: keep the text
      }
      calls.push({ headers: req.headers, body });
      res.writeHead(200).end();
    });
  });

  await new Promise<void>((resolve) => {
    receiver.listen(0, '127.0.0.1', resolve);
  });
  const { port: receiverPort } = receiver.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${receiverPort}`,
    calls,
    callsFor: (event) => calls.filter((call) => call.body?.event === event),
    close: () =>
      new Promise<void>((resolve, reject) => {
        receiver.closeAllConnections();
        receiver.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};
