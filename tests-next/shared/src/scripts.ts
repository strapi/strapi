import fs from 'node:fs';
import path from 'node:path';

import type { App } from './app/generate';
import type { Server } from './app/server';
import { SERVER_SCRIPTS_DIR } from './test-plugin';

/**
 * Server scripts: code that runs inside the Strapi process of a test app, for the internals no
 * route reaches (transactions, the knex connection, the schema inspector, query scopes,
 * lifecycles, log calls). The old suite ran Strapi in the test process and did this inline.
 *
 * A server script is a CommonJS file next to the test, copied into the app before boot:
 *
 * ```js
 * // tests/core/database/server/transactions.js
 * module.exports = {
 *   register({ strapi }) {},   // optional, runs in Strapi's register phase
 *   bootstrap({ strapi }) {},  // optional, runs in Strapi's bootstrap phase
 *   actions: {
 *     async getKey({ strapi }, { id }) {
 *       const [row] = await strapi.db.queryBuilder('strapi::core-store').select(['key']).where({ id }).execute();
 *       return row.key;
 *     },
 *   },
 * };
 * ```
 *
 * Keep the assertions in the test: an action does what the old test did with `strapi` and
 * returns what it observed, as JSON.
 */

/**
 * Copy a server script into the app (`test-scripts/<name>.js`), before boot. `name` defaults
 * to the file name without `.js`. The copy can't require files next to the original: require
 * packages only (they resolve from the repo root).
 */
export const scaffoldServerScript = (app: App, file: string, name?: string): string => {
  const scriptName = name ?? path.basename(file, '.js');
  if (!/^[a-z][a-z0-9-]*$/.test(scriptName)) {
    throw new Error(`Server script names are kebab-case, got "${scriptName}".`);
  }
  const target = path.join(app.dir, SERVER_SCRIPTS_DIR, `${scriptName}.js`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  return scriptName;
};

/** An error thrown by a server script action, with its server-side name, details and stack. */
export class ServerScriptError extends Error {
  details: unknown;

  code: unknown;

  /** The stack of the error in the server. */
  serverStack: string | undefined;

  constructor({
    name,
    message,
    details,
    code,
    stack,
  }: {
    name: string;
    message: string;
    details?: unknown;
    code?: unknown;
    stack?: string;
  }) {
    super(message);
    this.name = name;
    this.details = details;
    this.code = code;
    this.serverStack = stack;
  }
}

/**
 * Run an action of a server script and return its result. An error the action throws is
 * rethrown as a `ServerScriptError` with the same name and message, so
 * `await expect(runInServer(...)).rejects.toMatchObject({ name: 'SavepointError' })` works.
 */
export const runInServer = async <T = unknown>(
  server: Server,
  script: string,
  action: string,
  args?: unknown
): Promise<T> => {
  const res = await fetch(`${server.url}/api/tests/scripts/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ script, action, args }),
  });
  const text = await res.text();
  let parsed: { result?: T; error?: ConstructorParameters<typeof ServerScriptError>[0] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`POST /api/tests/scripts/run answered ${res.status}: ${text}`);
  }
  if (!res.ok || parsed.error) {
    throw new ServerScriptError(parsed.error ?? { name: 'Error', message: text });
  }
  return parsed.result as T;
};
