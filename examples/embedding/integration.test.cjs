/* eslint-disable */
/**
 * Integration tests for the embedding recipes (Koa + Express hosts).
 *
 * Boots `loadStrapi` inside real host servers and asserts the host's own routes
 * and the embedded Strapi `/api/echo` route both work.
 *
 * Run with: `node integration.test.cjs` (from this directory).
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { loadStrapi } = require('@strapi/strapi');
const appDefinition = require('./app.cjs');
const { startKoaHost } = require('./koa-host.cjs');
const { startExpressHost } = require('./express-host.cjs');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('loadStrapi boots without listening and serves /api/echo via callback', async () => {
  const strapi = await loadStrapi(appDefinition, { serveAdminPanel: false });

  try {
    assert.strictEqual(strapi.isLoaded, true);
    assert.strictEqual(strapi.server.httpServer.listening, false);

    const echo = await request(strapi.server.app.callback())
      .post('/api/echo')
      .send({ ping: 'pong' });

    assert.strictEqual(echo.status, 200);
    assert.deepStrictEqual(echo.body, { youSent: { ping: 'pong' } });
  } finally {
    await strapi.destroy();
  }
});

test('Koa host: /health is host-owned; /api/echo is delegated to Strapi', async () => {
  const { server, strapi } = await startKoaHost();

  try {
    const http = request(server);

    const health = await http.get('/health');
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(health.body, { ok: true, host: 'koa' });

    const echo = await http.post('/api/echo').send({ host: 'koa' });
    assert.strictEqual(echo.status, 200);
    assert.deepStrictEqual(echo.body, { youSent: { host: 'koa' } });

    const missing = await http.get('/missing');
    assert.strictEqual(missing.status, 404);
  } finally {
    server.close();
    await strapi.destroy();
  }
});

test('Express host: /health is host-owned; /strapi/api/echo reaches Strapi', async () => {
  const { server, strapi, mountPath } = await startExpressHost();

  try {
    const http = request(server);

    const health = await http.get('/health');
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(health.body, { ok: true, host: 'express' });

    const echo = await http.post(`${mountPath}/api/echo`).send({ host: 'express' });
    assert.strictEqual(echo.status, 200);
    assert.deepStrictEqual(echo.body, { youSent: { host: 'express' } });

    const bareApi = await http.post('/api/echo').send({ host: 'express' });
    assert.strictEqual(bareApi.status, 404, 'Strapi is only mounted under /strapi');
  } finally {
    server.close();
    await strapi.destroy();
  }
});

const runOne = async (index) => {
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
