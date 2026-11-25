import type { UID } from '@strapi/types';

import type { Server } from './app/server';

/**
 * Data access in a running test server, through the test plugin (test-plugin/lib/data.js): what
 * a test that ran Strapi in its own process did with `strapi.db.query()` and
 * `strapi.documents()`.
 *
 * Check what a test is about through the public API it tests. Use these for setup, cleanup and
 * state no route exposes (internal content types, join tables).
 */

export type QueryMethod =
  | 'findOne'
  | 'findMany'
  | 'count'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'delete'
  | 'deleteMany';

export type DocumentMethod =
  | 'findOne'
  | 'findFirst'
  | 'findMany'
  | 'count'
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'discardDraft';

/** An error the server threw, with the name and details Strapi gave it. */
export class TestDataError extends Error {
  details: unknown;

  constructor(name: string, message: string, details: unknown) {
    super(message);
    this.name = name;
    this.details = details;
  }
}

const call = async <T>(
  server: Server,
  route: string,
  body: { uid: string; method: string; params: Record<string, unknown> }
): Promise<T> => {
  const res = await fetch(`${server.url}/api/tests${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: { result?: T; error?: { name: string; message: string; details?: unknown } };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`POST /api/tests${route} answered ${res.status}: ${text}`);
  }
  if (!res.ok || parsed.error) {
    const { name = 'Error', message = text, details } = parsed.error ?? {};
    throw new TestDataError(name, `${body.uid}.${body.method}: ${message}`, details);
  }
  return parsed.result as T;
};

/**
 * `strapi.db.query(uid)[method](params)` in the server. Rows come back as JSON: dates are
 * strings.
 *
 * ```ts
 * const stages = await queryDb<Stage[]>(server, 'plugin::review-workflows.workflow-stage', 'findMany', {
 *   where: { workflow: workflowId },
 * });
 * ```
 */
export const queryDb = <T = unknown>(
  server: Server,
  uid: UID.Schema,
  method: QueryMethod,
  params: Record<string, unknown> = {}
) => call<T>(server, '/db/query', { uid, method, params });

/**
 * `strapi.documents(uid)[method](params)` in the server.
 *
 * ```ts
 * const article = await documents(server, 'api::article.article', 'create', { data: { title } });
 * ```
 */
export const documents = <T = unknown>(
  server: Server,
  uid: UID.ContentType,
  method: DocumentMethod,
  params: Record<string, unknown> = {}
) => call<T>(server, '/documents', { uid, method, params });
