'use strict';

/**
 * Integration test: a locally-resolved plugin registered via a relative `resolve`
 * path loads and serves a route end-to-end.
 *
 * What is being proven
 * --------------------
 * Task 1 (`fix(core): resolve local plugins from dist root`) changed the fallback
 * in `get-enabled-plugins.ts` so that when `require.resolve()` cannot find a local
 * plugin path (because it is a relative path like `./src/plugins/ts-fixture`, not a
 * node module), Strapi resolves it against `strapi.dirs.dist.root` rather than
 * `strapi.dirs.app.root`.  In a TypeScript project `distDir` points to the compiled
 * output directory (e.g. `dist/`), so the compiled `strapi-server.js` produced from
 * `strapi-server.ts` is found there.  In a JS project (including this test harness)
 * `distDir === appDir`, so the behaviour is unchanged for existing apps.
 *
 * This test exercises the Task 1 code path end-to-end using the standard API-test
 * harness:
 *   1. Writes a local plugin (`strapi-server.js` – the compiled form of a TS entry)
 *      into the generated test-app's `src/plugins/ts-fixture/` directory.
 *   2. Registers the plugin in the test-app's `config/plugins.js` using a relative
 *      `resolve` path (matching the real-world TS-plugin usage).
 *   3. Boots a Strapi instance and asserts that `GET /api/ts-fixture/ping` → 200.
 *   4. Restores all modified files in `afterAll`.
 *
 * The fixture server file intentionally carries the `.js` extension (the compiled
 * output that `tsc` / the tsconfig from Task 2 would emit from `strapi-server.ts`).
 * The source-level TypeScript behaviour – and the distDir ≠ appDir distinction – is
 * covered by the unit test added in Task 1.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

// ---------------------------------------------------------------------------
// Fixture content
// ---------------------------------------------------------------------------

/**
 * Minimal package.json for the fixture plugin.
 * The plugin loader always tries to `require(join(pathToPlugin, 'package.json'))`,
 * so a local plugin must supply one.  We mark it as a Strapi plugin so the
 * loader populates `info` correctly, matching real-world usage.
 */
const PLUGIN_PACKAGE_JSON_CONTENT = JSON.stringify(
  {
    name: 'ts-fixture',
    version: '0.0.0',
    strapi: {
      kind: 'plugin',
      name: 'ts-fixture',
    },
  },
  null,
  2
);

/**
 * The compiled server entry for the local ts-fixture plugin.
 * In a real TS project this file is produced by `tsc` from `strapi-server.ts`.
 * We write it as plain JS so the test is self-contained inside the JS test-app.
 */
const PLUGIN_SERVER_CONTENT = `'use strict';
module.exports = () => ({
  register() {},
  bootstrap() {},
  routes: {
    'content-api': {
      type: 'content-api',
      routes: [
        {
          method: 'GET',
          path: '/ping',
          handler: 'ping.index',
          config: { auth: false },
        },
      ],
    },
  },
  controllers: {
    ping: {
      index(ctx) {
        ctx.body = { ok: true, lang: 'ts' };
      },
    },
  },
});
`;

/**
 * plugins.js that registers the local fixture via a relative resolve path –
 * the exact pattern a user would write for a local TS plugin.
 */
const PLUGINS_CONFIG_CONTENT = `'use strict';
module.exports = () => ({
  'ts-fixture': {
    enabled: true,
    resolve: './src/plugins/ts-fixture',
  },
});
`;

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

let strapiInstance;
let rq;
let pluginDir;
let pluginFile;
let pluginsConfigPath;
let originalPluginsConfig;

beforeAll(async () => {
  dotenv.config({ path: process.env.ENV_PATH });
  const baseDir = path.dirname(process.env.ENV_PATH);

  // Paths to files we will create / overwrite
  pluginDir = path.join(baseDir, 'src', 'plugins', 'ts-fixture');
  pluginFile = path.join(pluginDir, 'strapi-server.js');
  pluginsConfigPath = path.join(baseDir, 'config', 'plugins.js');

  // Save original plugins.js so we can restore it
  originalPluginsConfig = fs.existsSync(pluginsConfigPath)
    ? fs.readFileSync(pluginsConfigPath, 'utf8')
    : null;

  // Write fixture files
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'package.json'), PLUGIN_PACKAGE_JSON_CONTENT);
  fs.writeFileSync(pluginFile, PLUGIN_SERVER_CONTENT);
  fs.writeFileSync(pluginsConfigPath, PLUGINS_CONFIG_CONTENT);

  // Boot Strapi – bypassAuth so the content-api authenticator is registered
  strapiInstance = await createStrapiInstance();
  rq = createContentAPIRequest({ strapi: strapiInstance });
});

afterAll(async () => {
  // Tear down Strapi first
  if (strapiInstance) {
    await strapiInstance.destroy();
  }

  // Restore plugins.js
  if (originalPluginsConfig !== null) {
    fs.writeFileSync(pluginsConfigPath, originalPluginsConfig);
  } else if (fs.existsSync(pluginsConfigPath)) {
    fs.unlinkSync(pluginsConfigPath);
  }

  // Remove the fixture plugin directory
  if (pluginDir && fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }
});

describe('Local plugin loading (simulates compiled TS-only plugin)', () => {
  test('GET /api/ts-fixture/ping returns 200 with expected body', async () => {
    const res = await rq({ method: 'GET', url: '/ts-fixture/ping' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, lang: 'ts' });
  });
});
