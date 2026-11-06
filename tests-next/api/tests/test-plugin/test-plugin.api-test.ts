import os from 'node:os';

import {
  TEST_PLUGIN_ENV_VAR,
  appPort,
  createFakeAiTranslationsProvider,
  generateApp,
  isLoopbackAddress,
  startServer,
  type App,
  type Server,
} from '@strapi/tests-shared';

const worker = Number(process.env.JEST_WORKER_ID ?? 1);

jest.setTimeout(180_000);

/** A non-loopback IPv4 address of this machine, if it has one. */
const externalAddress = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .find((info) => info && info.family === 'IPv4' && !info.internal)?.address;

describe('test plugin', () => {
  let app: App;
  let server: Server;

  const call = (method: string, path: string, body?: unknown) =>
    fetch(`${server.url}/api/tests${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    app = await generateApp({ name: `api-plugin-${worker}` });
    // Listen on every interface, so the loopback check can be tried from another address.
    server = await startServer(app, {
      port: appPort('api', 10 + worker - 1),
      env: { HOST: '0.0.0.0' },
    });
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('reads the feature flags and license features', async () => {
    const res = await call('GET', '/features');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      future: unknown;
      flags: unknown;
      ee: { isEE: unknown; features: unknown };
    };
    expect(body.future).toEqual(expect.any(Object));
    expect(body.flags).toEqual(expect.any(Object));
    expect(typeof body.ee.isEE).toBe('boolean');
    // fetch builds its JSON outside Jest's realm, so expect.any(Array) would not match.
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

    expect(await (await call('POST', '/rate-limit', { enabled: true })).json()).toEqual({
      enabled: true,
    });
    expect(await failedLogins('rate-limit-on@tests.strapi.io')).toContain(429);

    expect((await call('POST', '/rate-limit', { enabled: false })).status).toBe(200);
    expect(await failedLogins('rate-limit-off-again@tests.strapi.io')).not.toContain(429);

    expect((await call('POST', '/rate-limit', { enabled: 'yes' })).status).toBe(400);
  });

  test('creates the test transfer token once', async () => {
    expect(await (await call('POST', '/transfer-token')).json()).toEqual({ created: true });
    expect(await (await call('POST', '/transfer-token')).json()).toEqual({ created: false });
  });

  test('records nothing when the fake AI provider is off, and clears the calls', async () => {
    expect(await (await call('GET', '/ai/calls')).json()).toEqual({ registered: false, calls: [] });
    expect((await call('DELETE', '/ai/calls')).status).toBe(204);
    expect(await (await call('GET', '/ai/calls')).json()).toEqual({ registered: false, calls: [] });
  });

  test('refuses requests that are not from loopback', async () => {
    const address = externalAddress();
    if (!address) {
      console.warn('No non-loopback interface: skipping the remote request check.');
      return;
    }
    const res = await fetch(`http://${address}:${server.port}/api/tests/features`);
    expect(res.status).toBe(403);
  });

  test('fails the boot when the fake AI provider is requested but rejected', async () => {
    const { ee } = (await (await call('GET', '/features')).json()) as {
      ee: { isEE: boolean; features: string[] };
    };
    if (ee.isEE && ee.features.includes('cms-byok-ai')) {
      console.warn('EE with cms-byok-ai: the fake AI provider is accepted, skipping.');
      return;
    }

    await server.stop();
    await expect(
      startServer(app, { port: appPort('api', 10 + worker - 1), fakeAiProvider: true })
    ).rejects.toThrow(
      // Strapi wraps the error in a box: match the start, which stays on one line.
      'STRAPI_TEST_AI_PROVIDER=fake, but Strapi rejected the fake AI'
    );
  });

  test(`is not loaded without ${TEST_PLUGIN_ENV_VAR}=true`, async () => {
    await server.stop();
    server = await startServer(app, { port: appPort('api', 10 + worker - 1), testPlugin: false });

    expect((await call('GET', '/features')).status).toBe(404);
  });
});

describe('test plugin helpers', () => {
  test('only treats loopback addresses as loopback', () => {
    expect(['127.0.0.1', '::1', '::ffff:127.0.0.1'].every(isLoopbackAddress)).toBe(true);
    expect(['10.0.0.2', '::ffff:10.0.0.2', '', undefined].some(isLoopbackAddress)).toBe(false);
  });

  test('the fake AI provider translates text and keeps the structure', async () => {
    const { provider, calls } = createFakeAiTranslationsProvider();
    const content = {
      title: 'Hello',
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

    const result = await provider.generateTranslations({
      sourceLocale: 'en',
      targetLocales: ['fr'],
      content,
    });

    expect(result.localizations).toEqual([
      {
        locale: 'fr',
        content: {
          title: '[fr] Hello',
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
