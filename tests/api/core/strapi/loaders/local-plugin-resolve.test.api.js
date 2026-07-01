'use strict';

/**
 * Integration test: a local plugin registered via a relative `resolve` path
 * loads and serves a route end-to-end.
 *
 * What is being proven
 * --------------------
 * The fix in `get-enabled-plugins.ts` changed the fallback so that when
 * `require.resolve()` cannot find a local plugin path (because it is a
 * relative path like `./src/plugins/my-plugin`, not a node module), Strapi
 * resolves it against `strapi.dirs.dist.root` rather than `strapi.dirs.app.root`.
 *
 * This test guards that resolve/load path end-to-end:
 *   1. Writes a local plugin (`strapi-server.js`) into the generated test-app's
 *      `src/plugins/local-fixture/` directory.
 *   2. Registers the plugin in the test-app's `config/plugins.js` using a
 *      relative `resolve` path (the pattern a user writes for a local plugin).
 *   3. Boots a Strapi instance and asserts that GET /api/local-fixture/ping → 200.
 *   4. Restores all modified files in `afterAll`.
 *
 * Important: the API-test harness is JS-only (`distDir === appDir`, no `tsc`
 * step). This test therefore cannot exercise a real TypeScript source file — the
 * fixture is plain JS. The TypeScript compile→dist→load path (where distDir ≠
 * appDir) is covered by the Task 1 unit test and a manual build/start smoke
 * test. Do NOT interpret this test as integration-testing TypeScript compilation.
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
    name: 'local-fixture',
    version: '0.0.0',
    strapi: {
      kind: 'plugin',
      name: 'local-fixture',
    },
  },
  null,
  2
);

/**
 * Minimal server entry for the local fixture plugin.
 * Plain JS — the harness is a JS-only app; no TypeScript compilation occurs.
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
        ctx.body = { ok: true, lang: 'js' };
      },
    },
  },
});
`;

/**
 * plugins.js that registers the local fixture via a relative resolve path —
 * the exact pattern a user would write for a local plugin.
 */
const PLUGINS_CONFIG_CONTENT = `'use strict';
module.exports = () => ({
  'local-fixture': {
    enabled: true,
    resolve: './src/plugins/local-fixture',
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
let srcPluginsDirCreatedByTest;

beforeAll(async () => {
  dotenv.config({ path: process.env.ENV_PATH });
  const baseDir = path.dirname(process.env.ENV_PATH);

  // Paths to files we will create / overwrite
  const srcPluginsDir = path.join(baseDir, 'src', 'plugins');
  pluginDir = path.join(srcPluginsDir, 'local-fixture');
  pluginFile = path.join(pluginDir, 'strapi-server.js');
  pluginsConfigPath = path.join(baseDir, 'config', 'plugins.js');

  // Track whether src/plugins already existed so afterAll can clean up safely
  srcPluginsDirCreatedByTest = !fs.existsSync(srcPluginsDir);

  // Save original plugins.js so we can restore it
  originalPluginsConfig = fs.existsSync(pluginsConfigPath)
    ? fs.readFileSync(pluginsConfigPath, 'utf8')
    : null;

  // Write fixture files
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'package.json'), PLUGIN_PACKAGE_JSON_CONTENT);
  fs.writeFileSync(pluginFile, PLUGIN_SERVER_CONTENT);
  fs.writeFileSync(pluginsConfigPath, PLUGINS_CONFIG_CONTENT);

  // Boot Strapi — bypassAuth so the content-api authenticator is registered
  strapiInstance = await createStrapiInstance();
  rq = await createContentAPIRequest({ strapi: strapiInstance });
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

  // Remove src/plugins only if this test created it and it is now empty
  if (srcPluginsDirCreatedByTest) {
    const srcPluginsDir = path.dirname(pluginDir);
    if (fs.existsSync(srcPluginsDir)) {
      const remaining = fs.readdirSync(srcPluginsDir);
      if (remaining.length === 0) {
        fs.rmdirSync(srcPluginsDir);
      }
    }
  }
});

describe('Local plugin registered via relative resolve path loads and serves a route', () => {
  test('GET /api/local-fixture/ping returns 200 with expected body', async () => {
    const res = await rq({ method: 'GET', url: '/local-fixture/ping' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, lang: 'js' });
  });
});
