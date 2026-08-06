/* eslint-disable */
/**
 * End-to-end integration test for Programmatic Strapi (Phase 1).
 *
 * Boots a fully programmatic app (no `config/**`, no `src/api/**`, no
 * `package.json` plugin scan), then asserts:
 *   - the custom inline route is mounted and public,
 *   - auto-CRUD routes are mounted and auth-gated (secure by default),
 *   - the auto-generated service + DB schema work via the document service,
 *   - a `fromDisk(...)` content type boots and registers its model.
 *
 * Run with: `node integration.test.cjs` (from this directory). Exits non-zero
 * on the first failed assertion.
 */
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const {
  defineApp,
  defineComponent,
  definePlugin,
  defineConfig,
  fromDisk,
  createStrapi,
  scaffoldToDefineApp,
} = require('@strapi/strapi');
const is = require('@strapi/strapi/attributes');
const { recommendedPlugins } = require('@strapi/strapi/plugins');

// The recommended preset as the array (definePlugin) form: each map entry is
// re-expressed as a definePlugin result carrying its own canonical name. Proves
// the array form boots end-to-end with no plugin-package changes.
const recommendedPluginsArray = () =>
  Object.entries(recommendedPlugins()).map(([name, entry]) =>
    definePlugin({ name, plugin: entry.plugin, resolve: entry.resolve })
  );

const baseConfig = (filename) =>
  defineConfig({
    database: { connection: { client: 'sqlite', connection: { filename } } },
    server: { host: '127.0.0.1', port: 0, app: { keys: ['k1', 'k2'] } },
    admin: {
      apiToken: { salt: 's1' },
      auth: { secret: 's2' },
      transfer: { token: { salt: 's3' } },
      secrets: { encryptionKey: '0123456789abcdef0123456789abcdef' },
    },
    logger: { config: { level: 'warn' } },
  });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('G2: in-code app — custom route, auto-CRUD, document service, schema', async () => {
  const app = defineApp({
    config: baseConfig('.tmp/g2.db'),
    plugins: recommendedPlugins(),
    contentTypes: [
      {
        singularName: 'article',
        pluralName: 'articles',
        displayName: 'Article',
        attributes: { title: is.string({ required: true }), content: is.text() },
      },
    ],
    routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    const http = request(strapi.server.app.callback());

    // Custom inline route — content-api (under /api) and public by default.
    const echo = await http.post('/api/echo').send({ ping: 'pong' });
    assert.strictEqual(echo.status, 200, 'POST /api/echo should be public (200)');
    assert.deepStrictEqual(echo.body, { youSent: { ping: 'pong' } }, 'echo returns body');

    // Auto-CRUD routes are mounted and secure (no users-permissions grant).
    const list = await http.get('/api/articles');
    assert.strictEqual(list.status, 401, 'auto-CRUD is auth-gated by default');

    // The auto-generated service + synced schema work via the document service.
    const model = strapi.getModel('api::article.article');
    const hasTable = await strapi.db.connection.schema.hasTable(model.collectionName);
    assert.strictEqual(hasTable, true, 'DB schema synced for the content type');

    const created = await strapi
      .documents('api::article.article')
      .create({ data: { title: 'Hello', content: 'World' } });
    assert.strictEqual(created.title, 'Hello', 'document service create works');

    const found = await strapi.documents('api::article.article').findMany({});
    assert.strictEqual(found.length, 1, 'document service findMany returns the created entry');
  } finally {
    await strapi.destroy();
  }
});

test('Phase 3: definePlugin array form boots and registers plugins by name', async () => {
  // The array form (`plugins: [definePlugin({ name, plugin })]`) must behave
  // identically to the name-keyed map: the canonical name travels on the value,
  // so the runtime registry keys (and `plugin::<name>.*` UIDs) line up and
  // auto-CRUD still works.
  const app = defineApp({
    config: baseConfig('.tmp/plugin-array.db'),
    plugins: recommendedPluginsArray(),
    contentTypes: [
      {
        singularName: 'tag',
        pluralName: 'tags',
        displayName: 'Tag',
        attributes: { label: is.string({ required: true }) },
      },
    ],
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    // Plugins are enabled, keyed by their canonical name (no scan, no map keys).
    const enabled = Object.keys(strapi.config.get('enabledPlugins')).sort();
    assert.deepStrictEqual(
      enabled,
      [
        'content-manager',
        'content-releases',
        'content-type-builder',
        'email',
        'i18n',
        'review-workflows',
        'upload',
      ],
      'array form enables every plugin keyed by its canonical name'
    );

    // i18n's plugin UID resolves — proves the name carried on the value lines up.
    assert.ok(strapi.plugin('i18n'), 'plugin("i18n") resolves from the array form');

    // Auto-CRUD (which reads strapi.plugin("i18n")) still works end-to-end.
    const model = strapi.getModel('api::tag.tag');
    const hasTable = await strapi.db.connection.schema.hasTable(model.collectionName);
    assert.strictEqual(hasTable, true, 'DB schema synced with the array plugin form');

    const created = await strapi.documents('api::tag.tag').create({ data: { label: 'news' } });
    assert.strictEqual(created.label, 'news', 'document service works with the array plugin form');
  } finally {
    await strapi.destroy();
  }
});

test('Phase 3: in-code defineComponent resolves on a content type component attribute', async () => {
  // Closes the loop the unit tests cannot: a content type's `component`
  // attribute references an in-code `defineComponent` by uid, and the component
  // data round-trips through DB schema sync + the document service.
  const seo = defineComponent({
    uid: 'shared.seo',
    displayName: 'SEO',
    attributes: { metaTitle: is.string({ required: true }), keywords: is.text() },
  });

  const app = defineApp({
    config: baseConfig('.tmp/component.db'),
    plugins: recommendedPlugins(),
    components: [seo],
    contentTypes: [
      {
        singularName: 'page',
        pluralName: 'pages',
        displayName: 'Page',
        attributes: {
          title: is.string({ required: true }),
          seo: is.component({ component: 'shared.seo' }),
        },
      },
    ],
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    // The in-code component is registered and its DB table is synced.
    const componentModel = strapi.getModel('shared.seo');
    assert.ok(componentModel, 'in-code component shared.seo is registered');
    assert.strictEqual(componentModel.modelType, 'component', 'registered as a component');

    const compTable = await strapi.db.connection.schema.hasTable(componentModel.collectionName);
    assert.strictEqual(compTable, true, 'DB schema synced for the in-code component');

    // The content type's component attribute references it and round-trips.
    const created = await strapi.documents('api::page.page').create({
      data: { title: 'Home', seo: { metaTitle: 'Welcome', keywords: 'a,b' } },
      populate: ['seo'],
    });
    assert.strictEqual(created.seo.metaTitle, 'Welcome', 'component data is created');

    const found = await strapi
      .documents('api::page.page')
      .findOne({ documentId: created.documentId, populate: ['seo'] });
    assert.strictEqual(found.seo.metaTitle, 'Welcome', 'component data round-trips on find');
  } finally {
    await strapi.destroy();
  }
});

test('G3: fromDisk content types boot and register their model', async () => {
  const diskApi = path.join(__dirname, 'disk-api');

  const app = defineApp({
    config: baseConfig('.tmp/g3.db'),
    plugins: recommendedPlugins(),
    contentTypes: fromDisk(diskApi),
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    const model = strapi.getModel('api::widget.widget');
    assert.ok(model, 'fromDisk content type api::widget.widget is registered');
    assert.strictEqual(model.info.singularName, 'widget');

    const hasTable = await strapi.db.connection.schema.hasTable(model.collectionName);
    assert.strictEqual(hasTable, true, 'fromDisk content type schema synced');
  } finally {
    await strapi.destroy();
  }
});

test('Phase 3: scaffoldToDefineApp — converted fixture boots with inlined CTs', async () => {
  const fixtureRoot = path.join(
    __dirname,
    '../../packages/core/core/src/app-definition/__tests__/resources/scaffolded-app'
  );
  const { definition } = scaffoldToDefineApp({ projectRoot: fixtureRoot });

  const app = defineApp({
    ...definition,
    config: baseConfig('.tmp/codemod.db'),
    plugins: recommendedPlugins(),
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    const article = strapi.getModel('api::article.article');
    assert.ok(article, 'codemod-inlined article content type is registered');
    assert.strictEqual(article.info.singularName, 'article');

    const quote = strapi.getModel('shared.quote');
    assert.ok(quote, 'codemod-inlined shared.quote component is registered');
    assert.strictEqual(quote.modelType, 'component');

    const hasArticleTable = await strapi.db.connection.schema.hasTable(article.collectionName);
    assert.strictEqual(hasArticleTable, true, 'article schema synced after codemod conversion');
  } finally {
    await strapi.destroy();
  }
});

test('D5: minimal-plugin boot — only `email` + api:false content type', async () => {
  // Finding: a *true* zero-plugin boot is impossible because the always-on
  // admin server registers `/forgot-password`, which references the
  // `plugin::email.rateLimit` middleware. So `email` is the hard minimum.
  // (`i18n` is additionally required only when auto-CRUD is used, i.e.
  // `api: true` — see G2.) With `api: false` and `{ email }` the core boots.
  const lazy = (spec) => () => {
    const mod = require(spec);
    const resolved = mod && mod.__esModule ? mod.default : (mod?.default ?? mod);
    return typeof resolved === 'function'
      ? resolved({ env: require('@strapi/utils').env })
      : resolved;
  };

  const app = defineApp({
    config: baseConfig('.tmp/d5.db'),
    plugins: { email: lazy('@strapi/email/strapi-server') },
    contentTypes: [
      {
        singularName: 'note',
        pluralName: 'notes',
        displayName: 'Note',
        api: false,
        attributes: { body: is.text() },
      },
    ],
  });

  const strapi = createStrapi({ app, serveAdminPanel: false });
  await strapi.start();

  try {
    assert.deepStrictEqual(
      Object.keys(strapi.config.get('enabledPlugins')),
      ['email'],
      'only the explicitly added plugin is enabled (no scan)'
    );
    const model = strapi.getModel('api::note.note');
    assert.ok(model, 'content type registered with the minimal plugin set');
    const hasTable = await strapi.db.connection.schema.hasTable(model.collectionName);
    assert.strictEqual(hasTable, true, 'schema synced with the minimal plugin set');
  } finally {
    await strapi.destroy();
  }
});

// Each test boots a full Strapi instance. Booting several in one process leaks
// module-level plugin/global state, so the runner forks a fresh child process
// per test (`node integration.test.cjs <index>`) and aggregates the results.
const runOne = async (index) => {
  const fs = require('node:fs');
  fs.rmSync(path.join(__dirname, '.tmp'), { recursive: true, force: true });

  const [name, fn] = tests[index];
  try {
    await fn();
    console.log(`PASS  ${name}`);
    process.exit(0);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exit(1);
  }
};

const runAll = () => {
  let failed = 0;
  for (let i = 0; i < tests.length; i += 1) {
    const result = spawnSync(process.execPath, [__filename, String(i)], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });

    const out = `${result.stdout}${result.stderr}`;
    const line = out.split('\n').find((l) => l.startsWith('PASS') || l.startsWith('FAIL'));
    console.log(line || `FAIL  ${tests[i][0]} (no result)`);

    if (result.status !== 0) {
      failed += 1;
      // Surface the child's error output to aid debugging.
      console.error(out.split('\n').slice(-25).join('\n'));
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
};

const arg = process.argv[2];
if (arg !== undefined) {
  runOne(Number(arg));
} else {
  runAll();
}
