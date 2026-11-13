import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  TEST_AI_PROVIDER_ENV_VAR,
  TEST_PLUGIN_ENV_VAR,
  appPort,
  createFakeAiTranslationsProvider,
  generateApp,
  isLoopbackAddress,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';

const worker = Number(process.env.VITEST_POOL_ID ?? 1);
const port = appPort('api', worker - 1);

/** A non-loopback IPv4 address of this machine, if it has one. */
const externalAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((info) => info && info.family === 'IPv4' && !info.internal)?.address;

const call = (server: Server, method: string, route: string, body?: unknown) =>
  fetch(`${server.url}/api/tests${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let app: App;

beforeAll(async () => {
  app = await generateApp({ name: `api-plugin-${worker}` });
  // A known feature config, to check how /features splits it.
  fs.writeFileSync(
    path.join(app.dir, 'config', 'features.js'),
    'module.exports = () => ({ future: { testsFlag: true }, useLegacyMediaLibrary: false });\n'
  );
});

afterAll(async () => {
  await stopAllServers();
});

describe('test plugin routes', () => {
  let server: Server;

  beforeAll(async () => {
    // Listen on every interface, so the loopback check can be tried from another address.
    server = await startServer(app, { port, env: { HOST: '0.0.0.0' } });
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('reads the feature flags and license features', async () => {
    const res = await call(server, 'GET', '/features');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      future: Record<string, unknown>;
      flags: Record<string, unknown>;
      ee: { isEE: unknown; features: unknown };
    };
    expect(body.future).toEqual({ testsFlag: true });
    expect(body.flags).toEqual({ useLegacyMediaLibrary: false });
    expect(typeof body.ee.isEE).toBe('boolean');
    expect(Array.isArray(body.ee.features)).toBe(true);
  });

  test('turns the admin rate limit on and off', async () => {
    // The admin login rate limit allows 5 attempts per email, path and IP every 5 minutes.
    const failedLogins = async (email: string) => {
      const statuses: number[] = [];
      for (let i = 0; i < 8; i += 1) {
        const res = await fetch(`${server.url}/admin/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrong-password' }),
        });
        statuses.push(res.status);
      }
      return statuses;
    };

    // Off by default when the plugin loads.
    expect(await failedLogins('rate-limit-off@tests.strapi.io')).not.toContain(429);

    expect(await (await call(server, 'POST', '/rate-limit', { enabled: true })).json()).toEqual({
      enabled: true,
    });
    expect(await failedLogins('rate-limit-on@tests.strapi.io')).toContain(429);

    expect((await call(server, 'POST', '/rate-limit', { enabled: false })).status).toBe(200);
    expect(await failedLogins('rate-limit-off-again@tests.strapi.io')).not.toContain(429);

    expect((await call(server, 'POST', '/rate-limit', { enabled: 'yes' })).status).toBe(400);
  });

  test('creates the test transfer token once', async () => {
    expect(await (await call(server, 'POST', '/transfer-token')).json()).toEqual({ created: true });
    expect(await (await call(server, 'POST', '/transfer-token')).json()).toEqual({
      created: false,
    });
  });

  // With the fake provider off nothing is recorded, so this only checks that the routes answer.
  test('answers GET and DELETE /ai/calls while the fake AI provider is off', async () => {
    const empty = { registered: false, calls: [] };
    expect(await (await call(server, 'GET', '/ai/calls')).json()).toEqual(empty);
    expect((await call(server, 'DELETE', '/ai/calls')).status).toBe(204);
    expect(await (await call(server, 'GET', '/ai/calls')).json()).toEqual(empty);
  });

  (externalAddress ? test : test.skip)('refuses requests that are not from loopback', async () => {
    const res = await fetch(`http://${externalAddress}:${server.port}/api/tests/features`);
    expect(res.status).toBe(403);
  });
});

describe('test plugin boot options', () => {
  afterEach(async () => {
    await stopAllServers();
  });

  // With a license, Strapi may accept the fake provider (cms-byok-ai): only CE is checked here.
  (process.env.STRAPI_LICENSE ? test.skip : test)(
    'fails the boot when the fake AI provider is requested but rejected',
    async () => {
      await expect(startServer(app, { port, fakeAiProvider: true })).rejects.toThrow(
        // Strapi wraps the error in a box: match the start, which stays on one line.
        'STRAPI_TEST_AI_PROVIDER=fake, but Strapi rejected the fake AI'
      );
    }
  );

  test(`ignores a ${TEST_AI_PROVIDER_ENV_VAR} inherited from the shell`, async () => {
    const inherited = process.env[TEST_AI_PROVIDER_ENV_VAR];
    process.env[TEST_AI_PROVIDER_ENV_VAR] = 'fake';
    try {
      const server = await startServer(app, { port });
      expect(await (await call(server, 'GET', '/ai/calls')).json()).toEqual({
        registered: false,
        calls: [],
      });
    } finally {
      if (inherited === undefined) {
        delete process.env[TEST_AI_PROVIDER_ENV_VAR];
      } else {
        process.env[TEST_AI_PROVIDER_ENV_VAR] = inherited;
      }
    }
  });

  test('refuses fakeAiProvider without the test plugin', async () => {
    await expect(
      startServer(app, { port, fakeAiProvider: true, testPlugin: false })
    ).rejects.toThrow('fakeAiProvider needs the test plugin');
  });

  test(`is not loaded without ${TEST_PLUGIN_ENV_VAR}=true`, async () => {
    const server = await startServer(app, { port, testPlugin: false });
    expect((await call(server, 'GET', '/features')).status).toBe(404);
  });
});

describe('test plugin helpers', () => {
  test('only treats loopback addresses as loopback', () => {
    expect(['127.0.0.1', '::1', '::ffff:127.0.0.1'].every(isLoopbackAddress)).toBe(true);
    expect(['10.0.0.2', '::ffff:10.0.0.2', '', undefined].some(isLoopbackAddress)).toBe(false);
  });

  test('the fake AI provider only translates text, following the schema', async () => {
    const { provider, calls } = createFakeAiTranslationsProvider();
    const content = {
      title: 'Hello',
      slug: 'hello',
      contact: 'a@example.com',
      day: '2024-01-01',
      count: 2,
      body: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'World', bold: true },
            {
              type: 'link',
              url: 'https://strapi.io',
              children: [{ type: 'text', text: 'Strapi' }],
            },
          ],
        },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Title' }] },
      ],
      sections: [{ __component: 'shared.seo', metaTitle: 'Meta' }],
    };
    const contentTypeSchema = {
      title: { type: 'string' },
      slug: { type: 'uid' },
      contact: { type: 'email' },
      day: { type: 'date' },
      count: { type: 'integer' },
      body: { type: 'blocks' },
      sections: { type: 'dynamiczone' },
    };

    const result = await provider.generateTranslations({
      sourceLocale: 'en',
      targetLocales: ['fr'],
      content,
      contentTypeSchema,
    });

    expect(result.localizations).toEqual([
      {
        locale: 'fr',
        content: {
          title: '[fr] Hello',
          slug: 'hello',
          contact: 'a@example.com',
          day: '2024-01-01',
          count: 2,
          body: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: '[fr] World', bold: true },
                {
                  type: 'link',
                  url: 'https://strapi.io',
                  children: [{ type: 'text', text: '[fr] Strapi' }],
                },
              ],
            },
            { type: 'heading', level: 2, children: [{ type: 'text', text: '[fr] Title' }] },
          ],
          sections: [{ __component: 'shared.seo', metaTitle: '[fr] Meta' }],
        },
      },
    ]);
    expect(calls).toEqual([{ sourceLocale: 'en', targetLocales: ['fr'], content }]);
  });
});
