import type { ParameterizedContext } from 'koa';
import { createLogger } from '@strapi/logger';
import { beforeEach, describe, expect, it, test, vi, type Mock } from 'vitest';
import type { Modules } from '@strapi/types';

import createEventHub from '../event-hub';
import requestContext from '../request-context';
import createWebhookRunner from '../webhook-runner';

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
