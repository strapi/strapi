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
    expect((await call('POST', '/rate-limit', { enabled: true })).status).toBe(200);
    expect(await (await call('POST', '/rate-limit', { enabled: false })).json()).toEqual({
      enabled: false,
    });
    expect((await call('POST', '/rate-limit', { enabled: 'yes' })).status).toBe(400);
  });

  test('creates the test transfer token once', async () => {
    expect(await (await call('POST', '/transfer-token')).json()).toEqual({ created: true });
    expect(await (await call('POST', '/transfer-token')).json()).toEqual({ created: false });
  });

  test('records nothing when the fake AI provider is off', async () => {
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

  test('the fake AI provider prefixes every string with the target locale', async () => {
    const { provider, calls } = createFakeAiTranslationsProvider();
    const result = await provider.generateTranslations({
      sourceLocale: 'en',
      targetLocales: ['fr', 'de'],
      content: { title: 'Hello', blocks: [{ text: 'World' }], count: 2 },
    });

    expect(result.localizations).toEqual([
      {
        locale: 'fr',
        content: { title: '[fr] Hello', blocks: [{ text: '[fr] World' }], count: 2 },
      },
      {
        locale: 'de',
        content: { title: '[de] Hello', blocks: [{ text: '[de] World' }], count: 2 },
      },
    ]);
    expect(calls).toHaveLength(1);
  });
});
