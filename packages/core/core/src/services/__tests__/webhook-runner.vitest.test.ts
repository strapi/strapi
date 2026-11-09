import dns from 'node:dns';
import http from 'node:http';
import net, { type AddressInfo } from 'node:net';
import type { ParameterizedContext } from 'koa';
import { createLogger } from '@strapi/logger';
import { afterAll, beforeAll, beforeEach, describe, expect, it, test, vi, type Mock } from 'vitest';
import type { Modules } from '@strapi/types';

import createEventHub from '../event-hub';
import requestContext from '../request-context';
import createWebhookRunner from '../webhook-runner';
import type { Fetch } from '../../utils/fetch';

type Webhook = Modules.WebhookStore.Webhook;

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';

const createWebhook = (webhook: Partial<Webhook> = {}): Webhook => ({
  id: '1',
  name: 'webhook',
  url: 'https://example.com/hook',
  headers: {},
  events: ['entry.create'],
  isEnabled: true,
  ...webhook,
});

const entryEvent = (uid: string) => ({ model: uid.split('.')[1], uid, entry: { id: 1 } });

// The runner sends the webhooks asynchronously through a worker queue
const waitForQueue = () =>
  new Promise((resolve) => {
    setTimeout(resolve);
  });

const setup = () => {
  const eventHub = createEventHub();
  const fetch = vi.fn(async () => ({ ok: true, status: 200 }));
  const logger = { error: vi.fn() };

  const runner = createWebhookRunner({
    eventHub,
    requestContext,
    fetch: fetch as any,
    logger: logger as any,
  });

  const emit = async (event: string, info: Record<string, unknown>) => {
    await eventHub.emit(event, info);
    await waitForQueue();
  };

  // List the webhooks that have been sent as [url, payload]
  const getRequests = () =>
    (fetch.mock.calls as unknown as [string, { body: string }][]).map(([url, { body }]) => [
      url,
      JSON.parse(body),
    ]);

  return { runner, emit, getRequests };
};

describe('WebhookRunner', () => {
  test('Sends the event with its payload', async () => {
    const { runner, emit, getRequests } = setup();
    runner.add(createWebhook());

    await emit('entry.create', entryEvent(ARTICLE_UID));

    expect(getRequests()).toEqual([
      [
        'https://example.com/hook',
        expect.objectContaining({
          event: 'entry.create',
          model: 'article',
          uid: ARTICLE_UID,
          entry: { id: 1 },
        }),
      ],
    ]);
  });

  test('Does not send disabled webhooks', async () => {
    const { runner, emit, getRequests } = setup();
    runner.add(createWebhook({ isEnabled: false }));

    await emit('entry.create', entryEvent(ARTICLE_UID));

    expect(getRequests()).toEqual([]);
  });

  describe('Content type events', () => {
    test('Sends the events of every content type when they are listed in events', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(createWebhook({ events: ['entry.create'] }));

      await emit('entry.create', entryEvent(ARTICLE_UID));
      await emit('entry.create', entryEvent(PAGE_UID));

      expect(getRequests().map(([, payload]) => payload.uid)).toEqual([ARTICLE_UID, PAGE_UID]);
    });

    test('Only sends the events selected for a content type for this content type', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({
          events: [],
          contentTypeEvents: { [ARTICLE_UID]: ['entry.create'], [PAGE_UID]: ['entry.publish'] },
        })
      );

      await emit('entry.create', entryEvent(PAGE_UID));
      await emit('entry.create', entryEvent(ARTICLE_UID));
      await emit('entry.publish', entryEvent(ARTICLE_UID));
      await emit('entry.publish', entryEvent(PAGE_UID));

      expect(getRequests().map(([, payload]) => [payload.event, payload.uid])).toEqual([
        ['entry.create', ARTICLE_UID],
        ['entry.publish', PAGE_UID],
      ]);
    });

    test('Combines the events of every content type with the ones of a content type', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({
          events: ['entry.create'],
          contentTypeEvents: { [ARTICLE_UID]: ['entry.create', 'entry.update'] },
        })
      );

      await emit('entry.create', entryEvent(PAGE_UID));
      await emit('entry.create', entryEvent(ARTICLE_UID));
      await emit('entry.update', entryEvent(PAGE_UID));
      await emit('entry.update', entryEvent(ARTICLE_UID));

      // Sent once per event, even when the event is selected both ways
      expect(getRequests().map(([, payload]) => [payload.event, payload.uid])).toEqual([
        ['entry.create', PAGE_UID],
        ['entry.create', ARTICLE_UID],
        ['entry.update', ARTICLE_UID],
      ]);
    });

    test('Each webhook listening to the same event uses its own content types', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({
          id: '1',
          url: 'https://example.com/articles',
          events: [],
          contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
        })
      );
      runner.add(
        createWebhook({
          id: '2',
          url: 'https://example.com/pages',
          events: [],
          contentTypeEvents: { [PAGE_UID]: ['entry.create'] },
        })
      );
      runner.add(createWebhook({ id: '3', url: 'https://example.com/all' }));

      await emit('entry.create', entryEvent(PAGE_UID));

      expect(getRequests().map(([url]) => url)).toEqual([
        'https://example.com/pages',
        'https://example.com/all',
      ]);
    });

    test('Does not send content type events for events that are not about a content type', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({ events: [], contentTypeEvents: { [ARTICLE_UID]: ['media.create'] } })
      );

      await emit('media.create', { media: { id: 1 } });

      expect(getRequests()).toEqual([]);
    });

    test('Uses the new content type events once the webhook is updated', async () => {
      const { runner, emit, getRequests } = setup();
      const webhook = createWebhook({
        events: [],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
      });
      runner.add(webhook);

      runner.update({ ...webhook, contentTypeEvents: { [PAGE_UID]: ['entry.create'] } });

      await emit('entry.create', entryEvent(ARTICLE_UID));
      await emit('entry.create', entryEvent(PAGE_UID));

      expect(getRequests().map(([, payload]) => payload.uid)).toEqual([PAGE_UID]);
    });

    test('Stops listening to the events of a removed webhook', async () => {
      const { runner, emit, getRequests } = setup();
      const webhook = createWebhook({
        events: [],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
      });
      runner.add(webhook);
      runner.remove(webhook);

      await emit('entry.create', entryEvent(ARTICLE_UID));

      expect(getRequests()).toEqual([]);
    });
  });
});

const createBuildWebhook = (events: string[]): Webhook =>
  createWebhook({ id: 'build', name: 'Trigger build', url: 'https://example.com/build', events });

describe('Release webhooks', () => {
  const releaseAction: Modules.WebhookRunner.ReleaseAction = {
    uid: 'api::article.article',
    documentId: 'released',
    locale: 'en',
    event: 'entry.publish',
  };

  let eventHub: ReturnType<typeof createEventHub>;
  let runner: ReturnType<typeof createWebhookRunner>;
  let mockFetch: Mock;

  beforeEach(() => {
    eventHub = createEventHub();
    mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    runner = createWebhookRunner({
      eventHub,
      requestContext,
      logger: createLogger({ silent: true }),
      fetch: mockFetch,
      configuration: { deduplicateReleaseWebhooks: true },
    });
  });

  it.each([
    { configuration: {}, event: 'entry.publish' },
    { configuration: {}, event: 'entry.unpublish' },
    { configuration: { deduplicateReleaseWebhooks: false }, event: 'entry.publish' },
    { configuration: { deduplicateReleaseWebhooks: false }, event: 'entry.unpublish' },
  ])(
    'preserves release $event payloads with configuration=$configuration',
    async ({ configuration, event }) => {
      const getContext = vi.fn();

      runner = createWebhookRunner({
        eventHub,
        requestContext: { get: getContext, run: requestContext.run },
        logger: createLogger({ silent: true }),
        fetch: mockFetch,
        configuration,
      });

      runner.add(createBuildWebhook([event, 'releases.publish']));

      await eventHub.emit(event, { entry: { id: 1 } });

      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

      expect(getContext).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
        event,
        createdAt: expect.any(String),
        entry: { id: 1 },
      });
    }
  );

  it.each([
    { configuration: {}, requests: 11 },
    { configuration: { deduplicateReleaseWebhooks: false }, requests: 11 },
    { configuration: { deduplicateReleaseWebhooks: true }, requests: 1 },
  ])(
    'sends $requests requests for ten released entries with configuration=$configuration',
    async ({ configuration, requests }) => {
      runner = createWebhookRunner({
        eventHub,
        requestContext,
        logger: createLogger({ silent: true }),
        fetch: mockFetch,
        configuration,
      });

      runner.add(createBuildWebhook(['entry.publish', 'releases.publish']));

      for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        await runner.executeListener({
          event: 'entry.publish',
          info: { entry: { id } },
          releaseId: 1,
        });
      }

      await runner.executeListener({
        event: 'releases.publish',
        info: { isPublished: true, release: { id: 1 } },
      });

      expect(mockFetch).toHaveBeenCalledTimes(requests);
    }
  );

  it.each(['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish'])(
    'delivers standalone %s to a webhook subscribed to releases',
    async (event) => {
      runner.add(createBuildWebhook([event, 'releases.publish']));

      await runner.executeListener({ event, info: { entry: { id: 1 } } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/build',
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Strapi-Event': event }) })
      );
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'skips release %s for a webhook subscribed to releases',
    async (event) => {
      runner.add(createBuildWebhook([event, 'releases.publish']));

      await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

      expect(mockFetch).not.toHaveBeenCalled();
    }
  );

  it.each(['entry.publish', 'entry.unpublish'])(
    'delivers release %s to an entry-only webhook without exposing the release context',
    async (event) => {
      runner.add(createBuildWebhook([event, 'releases.publish']));
      runner.add({
        ...createBuildWebhook([event]),
        id: 'entries',
        url: 'https://example.com/entries',
      });

      await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/entries', expect.any(Object));
      expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
        event,
        createdAt: expect.any(String),
        entry: { id: 1 },
      });
    }
  );

  it.each([
    'entry.create',
    'entry.update',
    'entry.delete',
    'media.create',
    'media.update',
    'media.delete',
  ])('delivers %s during a release', async (event) => {
    runner.add(createBuildWebhook([event, 'releases.publish']));

    await runner.executeListener({ event, info: { entry: { id: 1 } }, releaseId: 1 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/build',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Strapi-Event': event }) })
    );
  });

  it.each([true, false])('delivers releases.publish with isPublished=%s', async (isPublished) => {
    runner.add(createBuildWebhook(['entry.publish', 'entry.unpublish', 'releases.publish']));

    await runner.executeListener({
      event: 'releases.publish',
      info: { isPublished, release: { id: 1 } },
      releaseId: 1,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      event: 'releases.publish',
      createdAt: expect.any(String),
      isPublished,
      release: { id: 1 },
    });
  });

  it.each(['entry.publish', 'entry.unpublish'])(
    'preserves internal subscribers when release %s webhooks are skipped',
    async (event) => {
      runner.add(createBuildWebhook([event, 'releases.publish']));

      const subscriber = vi.fn();
      eventHub.subscribe(subscriber);

      const info = {
        uid: 'api::article.article',
        entry: { documentId: 'released', locale: 'en' },
      };

      await requestContext.run(
        {
          state: {
            releaseId: 1,
            releaseAction: { ...releaseAction, event },
          },
        } as ParameterizedContext,
        async () => {
          await eventHub.emit(event, info);
        }
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(event, info);
      expect(mockFetch).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, 'en'])('recognizes the release action with locale=%s', async (locale) => {
    runner.add(createBuildWebhook(['entry.publish', 'releases.publish']));

    const info = {
      uid: 'api::article.article',
      entry: { documentId: 'released', locale },
    };

    await requestContext.run(
      {
        state: {
          releaseId: 1,
          releaseAction: { ...releaseAction, locale },
        },
      } as ParameterizedContext,
      async () => {
        await eventHub.emit('entry.publish', info);
      }
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'publish of another document',
      event: 'entry.publish',
      uid: 'api::article.article',
      entry: { documentId: 'related', locale: 'en' },
    },
    {
      name: 'unpublish of another document',
      event: 'entry.unpublish',
      uid: 'api::article.article',
      entry: { documentId: 'related', locale: 'en' },
    },
    {
      name: 'publish of another content type',
      event: 'entry.publish',
      uid: 'api::page.page',
      entry: { documentId: 'released', locale: 'en' },
    },
    {
      name: 'publish of another locale',
      event: 'entry.publish',
      uid: 'api::article.article',
      entry: { documentId: 'released', locale: 'fr' },
    },
    {
      name: 'unpublish during a publish action',
      event: 'entry.unpublish',
      uid: 'api::article.article',
      entry: { documentId: 'released', locale: 'en' },
    },
  ])('delivers a nested $name', async ({ event, uid, entry }) => {
    runner.add(createBuildWebhook([event, 'releases.publish']));

    await requestContext.run(
      { state: { releaseId: 1, releaseAction } } as ParameterizedContext,
      async () => {
        await eventHub.emit(event, { uid, entry });
      }
    );

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      event,
      createdAt: expect.any(String),
      uid,
      entry,
    });
  });

  it.each(['entry.publish', 'entry.unpublish'])(
    'retains the release context for %s waiting in the queue',
    async (event) => {
      runner.add(createBuildWebhook([event, 'releases.publish']));

      let finishRequests: (() => void) | undefined;
      const pendingRequests = new Promise<void>((resolve) => {
        finishRequests = resolve;
      });

      mockFetch.mockImplementation(async () => {
        await pendingRequests;

        return new Response(null, { status: 200 });
      });

      for (const id of [1, 2, 3, 4, 5]) {
        await eventHub.emit(event, { entry: { id } });
      }

      expect(mockFetch).toHaveBeenCalledTimes(5);

      const info = {
        uid: 'api::article.article',
        entry: { id: 6, documentId: 'released', locale: 'en' },
      };

      await requestContext.run(
        {
          state: {
            releaseId: 1,
            releaseAction: { ...releaseAction, event },
          },
        } as ParameterizedContext,
        async () => {
          await eventHub.emit(event, info);
        }
      );

      expect(requestContext.get()).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(5);

      if (!finishRequests) {
        throw new Error('Expected the pending requests to have a resolver');
      }

      finishRequests();

      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);

      for (const id of [1, 2, 3, 4, 5]) {
        expect(JSON.parse(String(mockFetch.mock.calls[id - 1][1]?.body))).toEqual({
          event,
          createdAt: expect.any(String),
          entry: { id },
        });
      }
    }
  );
});

describe('Destination checks', () => {
  interface ReceivedRequest {
    method?: string;
    host?: string;
    path?: string;
    body: string;
    authorization?: string;
  }

  const received: ReceivedRequest[] = [];
  let port: number;

  // Every path but /hook redirects
  const server = http.createServer((req, res) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      received.push({
        method: req.method,
        host: req.headers.host,
        path: req.url,
        body,
        authorization: req.headers.authorization,
      });

      const redirects: Record<string, [number, string]> = {
        '/same-origin': [307, '/hook'],
        '/to-hook-test': [307, `http://hook.test:${port}/hook`],
        '/to-internal-test': [307, `http://internal.test:${port}/hook`],
        '/see-other': [303, '/hook'],
        '/loop': [307, '/loop'],
      };
      const redirect = redirects[req.url ?? ''];

      if (redirect) {
        res.writeHead(redirect[0], { location: redirect[1] }).end('moved');
      } else {
        res.end('ok');
      }
    });
  });

  // The stubbed DNS: hook.test is the test server, internal.test a private address
  const resolve = (hostname: string) => {
    const address = { 'hook.test': '127.0.0.1', 'internal.test': '10.0.0.5' }[hostname];

    if (!address) {
      throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });
    }

    return [{ address, family: 4 }];
  };

  let lookup: ReturnType<typeof vi.spyOn<typeof dns.promises, 'lookup'>>;

  beforeAll(async () => {
    lookup = vi.spyOn(dns.promises, 'lookup');
    await new Promise<void>((done) => {
      server.listen(0, '127.0.0.1', () => done());
    });
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    lookup.mockRestore();
    server.closeAllConnections();
    await new Promise((done) => {
      server.close(done);
    });
  });

  beforeEach(() => {
    received.length = 0;
    lookup.mockReset();
    lookup.mockImplementation((async (hostname: string) =>
      resolve(hostname)) as unknown as typeof dns.promises.lookup);
  });

  const setupRunner = (
    destinationChecks?: Record<string, unknown>,
    fetch: Fetch = (url, init) => globalThis.fetch(url, init)
  ) => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const runner = createWebhookRunner({
      eventHub: createEventHub(),
      requestContext,
      logger: logger as any,
      configuration: destinationChecks ? { destinationChecks } : {},
      fetch,
    });

    const run = (path: string, host = `127.0.0.1:${port}`, headers = {}) =>
      runner.run(createWebhook({ url: `http://${host}${path}`, headers }), 'trigger-test');

    return { runner, run, logger };
  };

  const receivedPaths = () => received.map(({ host, path }) => `${host}${path}`);

  test('Allows any destination by default, without resolving it', async () => {
    const { runner, run } = setupRunner();

    await expect(runner.checkDestination('http://internal.test/hook')).resolves.toBeUndefined();
    await expect(run('/hook')).resolves.toEqual({ statusCode: 200 });
    expect(lookup).not.toHaveBeenCalled();
  });

  test('Warns at startup when checkOnSend or redirects are set without a block option', () => {
    expect(setupRunner({ checkOnSend: true }).logger.warn).toHaveBeenCalledTimes(1);
    expect(setupRunner({ redirects: 'check' }).logger.warn).toHaveBeenCalledTimes(1);
    expect(setupRunner({ redirects: 'none' }).logger.warn).not.toHaveBeenCalled();
  });

  test('Logs a webhook a check blocks once, as a warning, when an event triggers it', async () => {
    const eventHub = createEventHub();
    const logger = { error: vi.fn(), warn: vi.fn() };
    const runner = createWebhookRunner({
      eventHub,
      requestContext,
      logger: logger as any,
      configuration: { destinationChecks: { blockLoopback: true, checkOnSend: true } },
      fetch: (url, init) => globalThis.fetch(url, init),
    });

    runner.add(createWebhook({ url: `http://127.0.0.1:${port}/hook` }));
    await eventHub.emit('entry.create', { model: 'article', uid: ARTICLE_UID, entry: { id: 1 } });
    await new Promise((done) => {
      setTimeout(done, 50);
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });

  describe('redirects', () => {
    test("'follow' follows redirects, as before", async () => {
      const { run } = setupRunner({ redirects: 'follow' });

      await expect(run('/same-origin')).resolves.toEqual({ statusCode: 200 });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/same-origin`, `127.0.0.1:${port}/hook`]);
    });

    test("'none' doesn't follow redirects, and reports the redirect as the response", async () => {
      const { run } = setupRunner({ redirects: 'none' });

      await expect(run('/same-origin')).resolves.toEqual({ statusCode: 307, message: 'moved' });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/same-origin`]);
    });

    test("'check' follows a redirect to an address that is allowed", async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, redirects: 'check' });

      await expect(run('/to-hook-test')).resolves.toEqual({ statusCode: 200 });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/to-hook-test`, `hook.test:${port}/hook`]);
      // A 307 keeps the method and the body
      expect(received[1].method).toBe('POST');
      expect(JSON.parse(received[1].body)).toMatchObject({ event: 'trigger-test' });
    });

    test("'check' does not follow a redirect to a blocked address", async () => {
      const { run, logger } = setupRunner({ blockPrivateNetworks: true, redirects: 'check' });

      await expect(run('/to-internal-test')).rejects.toMatchObject({
        name: 'ApplicationError',
        message:
          'internal.test resolves to 10.0.0.5, which server.webhooks.destinationChecks.blockPrivateNetworks blocks. Set it to false to allow it.',
      });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/to-internal-test`]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Webhook "webhook" was not sent: internal.test resolves to 10.0.0.5'
        )
      );
    });

    test("'check' applies the checks to redirect targets, and to the first request only with checkOnSend", async () => {
      // The first request goes to 127.0.0.1, which the loopback check blocks
      const { run } = setupRunner({ blockLoopback: true, redirects: 'check' });

      await expect(run('/same-origin')).rejects.toMatchObject({
        name: 'ApplicationError',
        message: expect.stringContaining('server.webhooks.destinationChecks.blockLoopback blocks'),
      });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/same-origin`]);

      received.length = 0;
      const withOnSend = setupRunner({
        blockLoopback: true,
        redirects: 'check',
        checkOnSend: true,
      });

      await expect(withOnSend.run('/same-origin')).rejects.toMatchObject({
        name: 'ApplicationError',
      });
      expect(received).toEqual([]);
    });

    test("'check' stops after 5 redirects", async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, redirects: 'check' });

      await expect(run('/loop')).resolves.toEqual({
        statusCode: 500,
        message: 'The webhook was redirected more than 5 times',
      });
      expect(received).toHaveLength(6);
    });

    test("'check' follows redirects the way fetch does", async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, redirects: 'check' });

      // A 303 turns the request into a GET without a body
      await expect(run('/see-other')).resolves.toEqual({ statusCode: 200 });
      expect(received[1]).toMatchObject({ method: 'GET', path: '/hook', body: '' });

      // A redirect to another origin drops the Authorization header
      received.length = 0;
      await run('/to-hook-test', undefined, { Authorization: 'Bearer s3cret' });
      expect(received.map(({ authorization }) => authorization)).toEqual([
        'Bearer s3cret',
        undefined,
      ]);
    });
  });

  describe('checkOnSend', () => {
    test('sends to a hostname that resolves to an allowed address', async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, checkOnSend: true });

      await expect(run('/hook', `hook.test:${port}`)).resolves.toEqual({ statusCode: 200 });
      expect(receivedPaths()).toEqual([`hook.test:${port}/hook`]);
    });

    test('does not connect to a hostname that resolves to a blocked address', async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, checkOnSend: true });

      await expect(run('/hook', `internal.test:${port}`)).rejects.toMatchObject({
        name: 'ApplicationError',
        message: expect.stringContaining('internal.test resolves to 10.0.0.5'),
      });
      expect(received).toEqual([]);
    });

    test('checks the address the hostname resolves to when the webhook is sent', async () => {
      const { runner, run } = setupRunner({ blockPrivateNetworks: true, checkOnSend: true });

      // Public when the webhook is saved...
      lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }] as any);
      await expect(
        runner.checkDestination(`http://hook.test:${port}/hook`)
      ).resolves.toBeUndefined();

      // ...private when it is sent
      lookup.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }] as any);
      await expect(run('/hook', `hook.test:${port}`)).rejects.toMatchObject({
        name: 'ApplicationError',
        message: expect.stringContaining('hook.test resolves to 10.0.0.5'),
      });
      expect(received).toEqual([]);
    });

    test('also checks the redirects fetch follows', async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, checkOnSend: true });

      await expect(run('/to-internal-test')).rejects.toMatchObject({
        name: 'ApplicationError',
        message: expect.stringContaining('internal.test resolves to 10.0.0.5'),
      });
      expect(receivedPaths()).toEqual([`127.0.0.1:${port}/to-internal-test`]);
    });

    test('does not connect to an IP address that is blocked', async () => {
      const { run } = setupRunner({ blockLoopback: true, checkOnSend: true });

      await expect(run('/hook')).rejects.toMatchObject({
        name: 'ApplicationError',
        message: expect.stringContaining('blockLoopback blocks 127.0.0.1.'),
      });
      expect(received).toEqual([]);
    });

    test('passes the lookup options Node gives, when it asks for a single address', async () => {
      const { run } = setupRunner({ blockPrivateNetworks: true, checkOnSend: true });
      const autoSelectFamily = net.getDefaultAutoSelectFamily();

      net.setDefaultAutoSelectFamily(false);

      try {
        await expect(run('/hook', `hook.test:${port}`)).resolves.toEqual({ statusCode: 200 });
      } finally {
        net.setDefaultAutoSelectFamily(autoSelectFamily);
      }

      expect(lookup).toHaveBeenCalledWith(
        'hook.test',
        expect.objectContaining({ all: true, hints: dns.ADDRCONFIG })
      );
    });

    describe('with a proxy', () => {
      // A proxied strapi.fetch has a dispatcher
      const createProxiedFetch = (location?: string) =>
        Object.assign(
          vi.fn(async () =>
            location
              ? new Response('moved', { status: 307, headers: { location } })
              : new Response('ok')
          ),
          { dispatcher: {} }
        );

      test('checks the URL before sending it to the proxy', async () => {
        const proxiedFetch = createProxiedFetch();
        const { run } = setupRunner(
          { blockPrivateNetworks: true, checkOnSend: true },
          proxiedFetch as unknown as Fetch
        );

        await expect(run('/hook', 'internal.test')).rejects.toMatchObject({
          name: 'ApplicationError',
        });
        expect(proxiedFetch).not.toHaveBeenCalled();

        await expect(run('/hook', 'hook.test')).resolves.toEqual({ statusCode: 200 });
        expect(proxiedFetch).toHaveBeenCalledTimes(1);
        // The proxy's own dispatcher is kept
        expect(proxiedFetch.mock.calls[0]).not.toHaveProperty('1.dispatcher');
      });

      test('checks redirect targets before sending them to the proxy', async () => {
        const proxiedFetch = createProxiedFetch('http://internal.test/hook');
        const { run } = setupRunner(
          { blockPrivateNetworks: true, checkOnSend: true },
          proxiedFetch as unknown as Fetch
        );

        await expect(run('/hook', 'hook.test')).rejects.toMatchObject({
          name: 'ApplicationError',
          message: expect.stringContaining('internal.test resolves to 10.0.0.5'),
        });
        expect(proxiedFetch).toHaveBeenCalledTimes(1);
      });

      test("counts Node's own proxy support as a proxy", async () => {
        vi.stubEnv('HTTP_PROXY', 'http://proxy.test:3128');
        vi.stubEnv('NODE_USE_ENV_PROXY', '1');

        try {
          const fetch = vi.fn(async () => new Response('ok'));
          const { run } = setupRunner(
            { blockPrivateNetworks: true, checkOnSend: true },
            fetch as unknown as Fetch
          );

          await expect(run('/hook', 'internal.test')).rejects.toMatchObject({
            name: 'ApplicationError',
          });
          await expect(run('/hook', 'hook.test')).resolves.toEqual({ statusCode: 200 });
          // No dispatcher of its own, so the request still goes through Node's proxy
          expect(fetch.mock.calls).toHaveLength(1);
          expect(fetch.mock.calls[0]).not.toHaveProperty('1.dispatcher');
        } finally {
          vi.unstubAllEnvs();
        }
      });
    });
  });
});
