import createWebhookRunner from '../webhook-runner';
import type { WebhookRunner } from '../webhook-runner';

type Webhook = Parameters<WebhookRunner['run']>[0];

const makeWebhook = (overrides: Partial<Webhook> = {}): Webhook =>
  ({
    id: '1',
    name: 'test-webhook',
    url: 'http://localhost:1337/hook',
    headers: {},
    events: ['entry.create'],
    isEnabled: true,
    ...overrides,
  }) as Webhook;

const createRunner = (fetchImpl?: (...args: any[]) => Promise<any>) => {
  const fetch = jest.fn(fetchImpl ?? (() => Promise.resolve({ ok: true, status: 200 }) as any));
  const eventHub = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

  const runner = createWebhookRunner({
    eventHub: eventHub as any,
    logger: logger as any,
    configuration: { defaultHeaders: {} },
    fetch: fetch as any,
  });

  return { runner, fetch, eventHub, logger };
};

describe('WebhookRunner - content-type restriction', () => {
  describe('shouldDeliver', () => {
    test('delivers when the webhook has no restriction, regardless of the event uid', () => {
      const { runner } = createRunner();

      expect(runner.shouldDeliver(makeWebhook(), { uid: 'api::article.article' })).toBe(true);
      expect(runner.shouldDeliver(makeWebhook(), {})).toBe(true);
    });

    test('delivers when the restriction list is empty (backward compatible default)', () => {
      const { runner } = createRunner();

      expect(
        runner.shouldDeliver(makeWebhook({ contentTypes: [] }), { uid: 'api::article.article' })
      ).toBe(true);
    });

    test('delivers only when the event uid is in the restriction list', () => {
      const { runner } = createRunner();
      const webhook = makeWebhook({ contentTypes: ['api::article.article'] });

      expect(runner.shouldDeliver(webhook, { uid: 'api::article.article' })).toBe(true);
      expect(runner.shouldDeliver(webhook, { uid: 'api::page.page' })).toBe(false);
    });

    test('does not deliver a restricted webhook for events without a uid (media, media-folder)', () => {
      const { runner } = createRunner();
      const webhook = makeWebhook({ contentTypes: ['api::article.article'] });

      expect(runner.shouldDeliver(webhook, { media: {} })).toBe(false);
      expect(runner.shouldDeliver(webhook, {})).toBe(false);
    });
  });

  describe('executeListener', () => {
    test('runs the webhook when it matches the content-type restriction', async () => {
      const { runner, fetch } = createRunner();
      runner.add(makeWebhook({ contentTypes: ['api::article.article'] }));

      await runner.executeListener({
        event: 'entry.create',
        info: { uid: 'api::article.article' },
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('skips the webhook when it does not match the content-type restriction', async () => {
      const { runner, fetch } = createRunner();
      runner.add(makeWebhook({ contentTypes: ['api::article.article'] }));

      await runner.executeListener({
        event: 'entry.create',
        info: { uid: 'api::page.page' },
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    test('an unrestricted webhook still fires for every content type (backward compatible)', async () => {
      const { runner, fetch } = createRunner();
      runner.add(makeWebhook());

      await runner.executeListener({
        event: 'entry.create',
        info: { uid: 'api::article.article' },
      });
      await runner.executeListener({
        event: 'entry.create',
        info: { uid: 'api::page.page' },
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
