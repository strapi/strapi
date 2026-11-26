'use strict';

/**
 * Server scripts: code a test runs inside the Strapi process, for what no route reaches and the
 * data routes (lib/data.js) don't cover: transactions, the knex connection, the schema
 * inspector, query scopes, lifecycles, document service middlewares, log calls. The old suite
 * ran Strapi in the test process and did this inline.
 *
 * `scaffoldServerScript` (tests-next/shared/src/scripts.ts) copies a CommonJS module into the
 * app's `test-scripts/` folder before boot. Each module can export:
 *
 * - `register({ strapi })` and `bootstrap({ strapi })`: run in the test plugin's own
 *   `register` and `bootstrap` (what `createStrapiInstance({ register, bootstrap })` did)
 * - `actions`: functions `(context, args) => result`, run by POST /api/tests/scripts/run
 *   `{ script, action, args }`. `context` is `{ strapi, serializeError }`. The result goes
 *   back as JSON.
 *
 * The module stays loaded for the life of the server: module-level variables keep state between
 * actions (a registered scope, captured log calls).
 */

const fs = require('node:fs');
const path = require('node:path');

const constants = require('../constants.json');

const fail = (message) => {
  const error = new Error(message);
  error.name = 'TestScriptError';
  return error;
};

/** An error as plain JSON: name, message, the details Strapi and knex add, code and stack. */
const serializeError = (error) => {
  if (!(error instanceof Error) && (typeof error !== 'object' || error === null)) {
    return { name: 'Error', message: String(error) };
  }
  return {
    name: error.name,
    message: error.message,
    details: error.details,
    code: error.code,
    stack: error.stack,
  };
};

/** The scripts of the app, by name (file name without `.js`). */
const loadScripts = (strapi) => {
  const dir = path.join(strapi.dirs.app.root, constants.serverScriptsDir);
  const scripts = new Map();
  if (!fs.existsSync(dir)) {
    return scripts;
  }
  for (const file of fs.readdirSync(dir).sort()) {
    if (file.endsWith('.js')) {
      scripts.set(path.basename(file, '.js'), require(path.join(dir, file)));
    }
  }
  return scripts;
};

const runHook = async (scripts, hook, strapi) => {
  for (const script of scripts.values()) {
    if (typeof script[hook] === 'function') {
      await script[hook]({ strapi });
    }
  }
};

const runScript = async (strapi, scripts, body) => {
  const { script, action, args } = body ?? {};
  if (typeof script !== 'string' || typeof action !== 'string') {
    throw fail('Expected { "script": string, "action": string, "args"?: unknown }.');
  }
  const module = scripts.get(script);
  if (!module) {
    throw fail(
      `Unknown server script "${script}". Scaffolded: ${[...scripts.keys()].join(', ') || 'none'}.`
    );
  }
  const run = module.actions?.[action];
  if (typeof run !== 'function') {
    throw fail(
      `Server script "${script}" has no action "${action}". Actions: ${Object.keys(module.actions ?? {}).join(', ') || 'none'}.`
    );
  }
  return run({ strapi, serializeError }, args);
};

module.exports = { loadScripts, runHook, runScript, serializeError };
