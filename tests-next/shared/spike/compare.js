'use strict';

/**
 * Spike (CMS-1943): compare three reset methods on the same seeded app, same checks.
 *   node tests-next/shared/spike/compare.js [--resets=5]
 *
 *   reload  D1: POST /api/tests/reset (snapshot file restored in register, worker reload)
 *   sql     D2: POST /api/tests/restore-sql (tables copied back from the snapshot, no restart)
 *   dts     piste 2: POST /api/tests/restore-dts (seeded state exported as DTS, restored in process)
 *
 * Each round mutates state that Strapi may hold in memory (roles and permissions, core store via
 * the i18n default locale, admin users, entries), resets, then checks every mutation is gone
 * through the HTTP API, including the permission engine for a logged-in editor.
 */

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const appDir = path.join(repoRoot, 'test-apps/e2e/test-app-0');
const resets = Number(
  (process.argv.find((a) => a.startsWith('--resets=')) || '--resets=5').split('=')[1]
);
const port = 8400;
const base = `http://127.0.0.1:${port}`;
const ARTICLES = '/content-manager/collection-types/api::article.article';

const now = () => Number(process.hrtime.bigint()) / 1e6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

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
      if (status === 200 && body.pid !== notPid) return body;
    } catch {
      // restarting
    }
    await sleep(25);
  }
  throw new Error('server did not come back');
};

const login = async (email) => {
  const res = await request('POST', '/admin/login', { body: { email, password: 'Testing123!' } });
  if (!res.body?.data?.token) throw new Error(`login ${email}: ${res.status}`);
  return res.body.data.token;
};

/** Observable state, through the API only. */
const observe = async ({ admin, editor }) => {
  const roles = await request('GET', '/admin/roles', { token: admin });
  const editorRole = roles.body.data.find((r) => r.code === 'strapi-editor');
  const editorPermissions = await request('GET', `/admin/roles/${editorRole.id}/permissions`, {
    token: admin,
  });
  const locales = await request('GET', '/i18n/locales', { token: admin });
  const users = await request('GET', '/admin/users?pageSize=100', { token: admin });
  const articles = await request('GET', `${ARTICLES}?pageSize=100`, { token: admin });
  const editorReads = await request('GET', ARTICLES, { token: editor });
  const me = await request('GET', '/admin/users/me', { token: admin });

  return {
    roles: roles.body.data.map((r) => r.name).sort(),
    editorPermissions: editorPermissions.body.data.length,
    locales: locales.body.map((l) => `${l.code}${l.isDefault ? '*' : ''}`).sort(),
    users: users.body.data.results.map((u) => u.email).sort(),
    articles: articles.body.pagination.total,
    editorCanReadArticles: editorReads.status,
    adminTokenAfterReset: me.status,
    editorRoleId: editorRole.id,
  };
};

const mutate = async ({ admin }, state, i) => {
  await request('POST', '/admin/roles', {
    token: admin,
    body: { name: `Leak ${i}`, description: 'x' },
  });
  // Permission engine: the editor loses every permission.
  await request('PUT', `/admin/roles/${state.editorRoleId}/permissions`, {
    token: admin,
    body: { permissions: [] },
  });
  // Core store: i18n keeps its default locale there.
  const fr = await request('POST', '/i18n/locales', {
    token: admin,
    body: { code: 'fr', name: 'French (fr)', isDefault: true },
  });
  await request('POST', '/admin/users', {
    token: admin,
    body: {
      email: `leak${i}@testing.com`,
      firstname: 'Leak',
      lastname: 'User',
      roles: [state.editorRoleId],
    },
  });
  await request('POST', ARTICLES, { token: admin, body: { title: `Leak article ${i}` } });

  return fr.status;
};

const ONLY = process.env.ONLY;
const ALL_METHODS = {
  reload: async (boot) => {
    const res = await request('POST', '/api/tests/reset');
    if (res.status !== 202) throw new Error(`reset ${res.status}`);
    return waitForBoot({ notPid: boot.pid });
  },
  sql: async (boot) => {
    const res = await request('POST', '/api/tests/restore-sql');
    if (res.status !== 200)
      throw new Error(`restore-sql ${res.status} ${JSON.stringify(res.body)}`);
    return boot;
  },
  dts: async (boot) => {
    const res = await request('POST', '/api/tests/restore-dts');
    if (res.status !== 200)
      throw new Error(`restore-dts ${res.status} ${JSON.stringify(res.body)}`);
    return boot;
  },
};

const METHODS = Object.fromEntries(
  Object.entries(ALL_METHODS).filter(([k]) => !ONLY || k === ONLY)
);

const main = async () => {
  fs.rmSync(path.join(appDir, '.tmp'), { recursive: true, force: true });
  execFileSync('node', [path.join(__dirname, 'seed.js')], { cwd: appDir, stdio: 'ignore' });

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

  const report = {};
  try {
    let boot = await waitForBoot({ timeout: 120000 });
    const tokens = {
      admin: await login('test@testing.com'),
      editor: await login('editor@testing.com'),
    };

    const snap = await request('POST', '/api/tests/snapshot');
    const exp = await request('POST', '/api/tests/export-dts');
    console.log(
      `[compare] snapshot ${snap.body.ms.toFixed(0)} ms, DTS export ${exp.body.ms?.toFixed(0)} ms (${exp.status})`
    );

    const expected = await observe(tokens);
    console.log('[compare] expected', JSON.stringify(expected));

    for (const [name, reset] of Object.entries(METHODS)) {
      const times = [];
      const failures = [];
      let relogins = 0;
      for (let i = 0; i < resets; i += 1) {
        const frStatus = await mutate(tokens, expected, i);
        const mutated = await observe(tokens);
        if (i === 0)
          console.log(`[compare] ${name} mutated (fr ${frStatus})`, JSON.stringify(mutated));

        const start = now();
        boot = await reset(boot);
        // A restore that rewrites admin users or sessions logs everyone out: count the re-login.
        if ((await request('GET', '/admin/users/me', { token: tokens.admin })).status === 401) {
          relogins += 1;
          tokens.admin = await login('test@testing.com');
          tokens.editor = await login('editor@testing.com');
        }
        times.push(now() - start);

        const after = await observe(tokens);
        for (const key of Object.keys(expected)) {
          if (JSON.stringify(after[key]) !== JSON.stringify(expected[key])) {
            failures.push(
              `${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(after[key])}`
            );
          }
        }
      }
      report[name] = {
        median: median(times),
        min: Math.min(...times),
        max: Math.max(...times),
        relogins,
        failures: [...new Set(failures)],
      };
      console.log(
        `[compare] ${name}: median ${report[name].median.toFixed(0)} ms, re-logins ${relogins}/${resets}, ${report[name].failures.length ? 'FAIL ' + report[name].failures.join(' | ') : 'all checks OK'}`
      );
    }
  } catch (err) {
    console.error(logs.join('').split('\n').slice(-40).join('\n'));
    throw err;
  } finally {
    process.kill(-server.pid, 'SIGINT');
  }

  fs.writeFileSync(path.join(__dirname, 'compare-results.json'), JSON.stringify(report, null, 2));
};

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
