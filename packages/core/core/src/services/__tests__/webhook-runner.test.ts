import type { Modules } from '@strapi/types';

import createEventHub from '../event-hub';
import createWebhookRunner from '../webhook-runner';

type Webhook = Modules.WebhookStore.Webhook;

const ARTICLE_UID = 'api::article.article';

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
});
