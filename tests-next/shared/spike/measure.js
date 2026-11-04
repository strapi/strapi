'use strict';

/**
 * Spike (CMS-1943): measure the data lifecycle on a generated e2e test app.
 *   node tests-next/shared/spike/measure.js [appDir] [--resets=10]
 *
 * A. scaffold a content type before boot
 * B. in-process seed (seed.js)
 * C. boot `strapi develop --no-watch-admin --no-build-admin` with the tests plugin
 * D. log in through the admin API, then take an online snapshot (VACUUM INTO)
 * E. reset N times through POST /api/tests/reset (snapshot restored in register, on reload)
 *    and check that data written after the snapshot is gone and the login survived
 */

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const appArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const appDir = path.resolve(appArg || path.join(repoRoot, 'test-apps/e2e/test-app-0'));
const resets = Number(
  (process.argv.find((a) => a.startsWith('--resets=')) || '--resets=10').split('=')[1]
);
const port = 8400;
const base = `http://127.0.0.1:${port}`;

const now = () => Number(process.hrtime.bigint()) / 1e6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};
const record = (key, ms) => {
  results[key] = ms;
  console.log(`[measure] ${key}: ${ms.toFixed(0)} ms`);
};

const request = async (method, url, { body, token } = {}) => {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
};

const waitForBoot = async ({ notPid, timeout = 60000 } = {}) => {
  const start = now();
  while (now() - start < timeout) {
    try {
      const { status, body } = await request('GET', '/api/tests/boot');
      if (status === 200 && body.pid !== notPid) {
        return body;
      }
    } catch {
      // server down while the worker restarts
    }
    await sleep(25);
  }
  throw new Error('server did not come back');
};

// A. Scaffold a content type before boot.
const scaffoldContentType = () => {
  const dir = path.join(appDir, 'src/api/spike-item/content-types/spike-item');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'schema.json'),
    JSON.stringify(
      {
        kind: 'collectionType',
        collectionName: 'spike_items',
        info: { singularName: 'spike-item', pluralName: 'spike-items', displayName: 'Spike item' },
        options: { draftAndPublish: false },
        attributes: { name: { type: 'string' } },
      },
      null,
      2
    )
  );
};

const enablePlugin = () => {
  const file = path.join(appDir, 'config/plugins.js');
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('tests-next/shared/test-plugin')) {
    return;
  }
  const pluginPath = path.join(repoRoot, 'tests-next/shared/test-plugin');
  fs.writeFileSync(
    file,
    source.replace(
      'module.exports = () => ({',
      `module.exports = () => ({\n  tests: { enabled: true, resolve: ${JSON.stringify(pluginPath)} },`
    )
  );
};

const main = async () => {
  const tmpDir = path.join(appDir, '.tmp');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  scaffoldContentType();
  enablePlugin();

  // B. Seed in process.
  let start = now();
  execFileSync('node', [path.join(__dirname, 'seed.js')], { cwd: appDir, stdio: 'inherit' });
  record('B seed (node process, load + seed + destroy)', now() - start);

  // C. Boot the server.
  start = now();
  const server = spawn('npx', ['strapi', 'develop', '--no-watch-admin', '--no-build-admin'], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      STRAPI_TEST_PLUGIN: 'true',
      BROWSER: 'none',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const logs = [];
  server.stdout.on('data', (d) => logs.push(d.toString()));
  server.stderr.on('data', (d) => logs.push(d.toString()));

  try {
    let boot = await waitForBoot({ timeout: 120000 });
    record('C cold boot to first response', now() - start);

    const ct = await request('GET', '/admin/init');
    console.log(`[measure] /admin/init ${ct.status}`);

    // D. Log in through the API, then snapshot.
    start = now();
    const login = await request('POST', '/admin/login', {
      body: { email: 'test@testing.com', password: 'Testing123!' },
    });
    const token = login.body?.data?.token;
    record('D admin API login', now() - start);
    if (!token) throw new Error(`login failed: ${JSON.stringify(login.body)}`);

    const scaffolded = await request(
      'GET',
      '/admin/content-manager/collection-types/api::spike-item.spike-item',
      { token }
    );
    console.log(
      `[measure] scaffolded content type list: ${scaffolded.status}, ${scaffolded.body?.results?.length} entry`
    );

    const snap = await request('POST', '/api/tests/snapshot');
    record('D online snapshot (VACUUM INTO)', snap.body.ms);
    console.log(
      `[measure] snapshot size: ${(fs.statSync(snap.body.snapshot).size / 1024).toFixed(0)} KB`
    );

    // E. Write, reset, check.
    const times = [];
    for (let i = 0; i < resets; i += 1) {
      const role = await request('POST', '/admin/roles', {
        token,
        body: { name: `Spike role ${i}`, description: 'written after the snapshot' },
      });
      if (role.status !== 201)
        throw new Error(`create role: ${role.status} ${JSON.stringify(role.body)}`);

      start = now();
      const reset = await request('POST', '/api/tests/reset');
      if (reset.status !== 202) throw new Error(`reset: ${reset.status}`);
      boot = await waitForBoot({ notPid: boot.pid });
      times.push(now() - start);

      const roles = await request('GET', '/admin/roles', { token });
      const leaked = (roles.body.data || []).filter((r) => r.name.startsWith('Spike role'));
      const me = await request('GET', '/admin/users/me', { token });
      console.log(
        `[measure] reset ${i + 1}: ${times[i].toFixed(0)} ms, token after reset ${me.status}, leaked roles ${leaked.length}`
      );
      if (leaked.length) throw new Error('data written after the snapshot survived the reset');
    }

    times.sort((a, b) => a - b);
    record('E reset median', times[Math.floor(times.length / 2)]);
    record('E reset max', times[times.length - 1]);
    record('E reset min', times[0]);
  } catch (err) {
    console.error(logs.join('').split('\n').slice(-40).join('\n'));
    throw err;
  } finally {
    // Kill the whole group: npx, the develop primary and its worker.
    process.kill(-server.pid, 'SIGINT');
  }

  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
};

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
