'use strict';

/**
 * Data access for the tests, in the running server: what a test that ran Strapi in its own
 * process did with `strapi.db.query(uid)` and `strapi.documents(uid)`. The tests-next suites
 * start Strapi in another process, so they ask the test plugin (POST /api/tests/db/query and
 * POST /api/tests/documents). The methods are an allowlist: a test that needs another one adds
 * it here.
 *
 * Prefer the public API under test for what a test checks. This is for setup, cleanup, and state
 * no route exposes (rows of internal content types, join tables).
 */

const QUERY_METHODS = [
  'findOne',
  'findMany',
  'count',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
];

const DOCUMENT_METHODS = [
  'findOne',
  'findFirst',
  'findMany',
  'count',
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'discardDraft',
];

const fail = (message) => {
  const error = new Error(message);
  error.name = 'TestDataError';
  return error;
};

const check = (body, methods) => {
  const { uid, method, params = {} } = body ?? {};
  if (typeof uid !== 'string' || typeof method !== 'string') {
    throw fail('Expected { "uid": string, "method": string, "params"?: object }.');
  }
  if (!methods.includes(method)) {
    throw fail(`Unsupported method "${method}". Supported: ${methods.join(', ')}.`);
  }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    throw fail('"params" must be an object.');
  }
  return { uid, method, params };
};

/** `strapi.db.query(uid)[method](params)`, for content types and components. */
const runQuery = async (strapi, body) => {
  const { uid, method, params } = check(body, QUERY_METHODS);
  if (!strapi.getModel(uid)) {
    throw fail(`Unknown model "${uid}".`);
  }
  return strapi.db.query(uid)[method](params);
};

/** `strapi.documents(uid)[method](params)`, for content types. */
const runDocuments = async (strapi, body) => {
  const { uid, method, params } = check(body, DOCUMENT_METHODS);
  if (!strapi.contentType(uid)) {
    throw fail(`Unknown content type "${uid}".`);
  }
  return strapi.documents(uid)[method](params);
};

module.exports = { DOCUMENT_METHODS, QUERY_METHODS, runDocuments, runQuery };
