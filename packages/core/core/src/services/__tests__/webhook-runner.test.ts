import type { Modules } from '@strapi/types';

import createEventHub from '../event-hub';
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

const entryEvent = (uid: string, entry: Record<string, unknown> = { id: 1 }) => ({
  model: uid.split('.')[1],
  uid,
  entry,
});

// The runner sends the webhooks asynchronously through a worker queue
const waitForQueue = () =>
  new Promise((resolve) => {
    setTimeout(resolve);
  });

const setup = () => {
  const eventHub = createEventHub();
  const fetch = jest.fn(async () => ({ ok: true, status: 200 }));
  const logger = { error: jest.fn() };

  const runner = createWebhookRunner({ eventHub, fetch: fetch as any, logger: logger as any });

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

  return { runner, emit, getRequests, fetch };
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

  describe('Body template', () => {
    test('Sends the default payload when the webhook has no body', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(createWebhook({ body: null }));

      await emit('entry.create', entryEvent(ARTICLE_UID));

      const [[, payload]] = getRequests();
      expect(Object.keys(payload)).toEqual(['event', 'createdAt', 'model', 'uid', 'entry']);
    });

    test('Adds the rendered body template to the default payload', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({
          body: {
            ref: 'main',
            inputs: { event: '{{ event }}', title: '{{ entry.title }}' },
            text: '{{ model }} {{ entry.documentId }} was created',
          },
        })
      );

      await emit('entry.create', entryEvent(ARTICLE_UID, { documentId: 'abc', title: 'Hello' }));

      expect(getRequests()).toEqual([
        [
          'https://example.com/hook',
          {
            event: 'entry.create',
            createdAt: expect.any(String),
            model: 'article',
            uid: ARTICLE_UID,
            entry: { documentId: 'abc', title: 'Hello' },
            ref: 'main',
            inputs: { event: 'entry.create', title: 'Hello' },
            text: 'article abc was created',
          },
        ],
      ]);
    });

    test('A rendered key overrides the default key of the same name', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(createWebhook({ body: { event: 'strapi.{{ event }}', entry: '{{ entry.id }}' } }));

      await emit('entry.create', entryEvent(ARTICLE_UID));

      expect(getRequests()).toEqual([
        [
          'https://example.com/hook',
          expect.objectContaining({ event: 'strapi.entry.create', entry: 1, uid: ARTICLE_UID }),
        ],
      ]);
    });

    test('Sends the rendered body template alone in replace mode', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(
        createWebhook({
          body: { ref: 'main', inputs: { title: '{{ entry.title }}' } },
          bodyMode: 'replace',
        })
      );

      await emit('entry.create', entryEvent(ARTICLE_UID, { id: 1, title: 'Hello' }));

      expect(getRequests()).toEqual([
        ['https://example.com/hook', { ref: 'main', inputs: { title: 'Hello' } }],
      ]);
    });

    test('Keeps the webhook headers and the event header with a custom body', async () => {
      const { runner, emit, fetch } = setup();
      runner.add(
        createWebhook({ headers: { Authorization: 'Bearer token' }, body: { ref: 'main' } })
      );

      await emit('entry.create', entryEvent(ARTICLE_UID));

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'post',
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'X-Strapi-Event': 'entry.create',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('Each webhook listening to the same event uses its own body', async () => {
      const { runner, emit, getRequests } = setup();
      runner.add(createWebhook({ id: '1', url: 'https://example.com/default' }));
      runner.add(
        createWebhook({
          id: '2',
          url: 'https://example.com/replace',
          body: { uid: '{{ uid }}' },
          bodyMode: 'replace',
        })
      );
      runner.add(
        createWebhook({ id: '3', url: 'https://example.com/merge', body: { ref: 'main' } })
      );

      await emit('entry.create', entryEvent(ARTICLE_UID));

      expect(getRequests()).toEqual([
        ['https://example.com/default', expect.objectContaining({ event: 'entry.create' })],
        ['https://example.com/replace', { uid: ARTICLE_UID }],
        [
          'https://example.com/merge',
          expect.objectContaining({ event: 'entry.create', ref: 'main' }),
        ],
      ]);
    });

    test('Uses the new body and mode once the webhook is updated', async () => {
      const { runner, emit, getRequests } = setup();
      const webhook = createWebhook({ body: { version: 1 }, bodyMode: 'replace' });
      runner.add(webhook);

      runner.update({ ...webhook, body: { version: 2 } });
      await emit('entry.create', entryEvent(ARTICLE_UID));

      runner.update({ ...webhook, body: { version: 3 }, bodyMode: 'merge' });
      await emit('entry.create', entryEvent(ARTICLE_UID));

      runner.update({ ...webhook, body: null });
      await emit('entry.create', entryEvent(ARTICLE_UID));

      expect(getRequests().map(([, payload]) => payload)).toEqual([
        { version: 2 },
        expect.objectContaining({ event: 'entry.create', version: 3 }),
        expect.objectContaining({ event: 'entry.create', uid: ARTICLE_UID }),
      ]);
      expect(getRequests()[2][1]).not.toHaveProperty('version');
    });

    test('Renders the body of a test trigger against an empty payload', async () => {
      const { runner, getRequests } = setup();

      await runner.run(
        createWebhook({ body: { ref: 'main', title: '{{ entry.title }}' } }),
        'trigger-test',
        {}
      );

      expect(getRequests()).toEqual([
        [
          'https://example.com/hook',
          { event: 'trigger-test', createdAt: expect.any(String), ref: 'main', title: null },
        ],
      ]);
    });
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
