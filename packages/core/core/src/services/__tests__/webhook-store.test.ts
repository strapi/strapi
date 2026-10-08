import type { Modules } from '@strapi/types';

import { createWebhookStore } from '../webhook-store';

type Webhook = Modules.WebhookStore.Webhook;

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';

const createDb = () => {
  const query = {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const db = { query: jest.fn(() => query) };

  return { db, query };
};

const createWebhook = (webhook: Partial<Webhook> = {}): Webhook => ({
  id: '1',
  name: 'Deploy site',
  url: 'https://example.com/hook',
  headers: {},
  events: ['entry.create'],
  isEnabled: true,
  ...webhook,
});

const toRow = (webhook: Webhook, row: Record<string, unknown> = {}) => ({
  id: webhook.id,
  name: webhook.name,
  url: webhook.url,
  headers: webhook.headers,
  events: webhook.events,
  contentTypeEvents: webhook.contentTypeEvents ?? {},
  enabled: webhook.isEnabled,
  ...row,
});

const setup = () => {
  const { db, query } = createDb();
  const store = createWebhookStore({ db: db as any });

  return { store, query };
};

describe('Webhook store', () => {
  describe('createWebhook', () => {
    test('Only saves per content type the events that are not sent for every content type', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({
        events: ['entry.create'],
        contentTypeEvents: {
          [ARTICLE_UID]: ['entry.create', 'entry.publish'],
          [PAGE_UID]: ['entry.create'],
        },
      });
      query.create.mockResolvedValue(
        toRow(webhook, { contentTypeEvents: { [ARTICLE_UID]: ['entry.publish'] } })
      );

      const created = await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: {
          name: webhook.name,
          url: webhook.url,
          headers: webhook.headers,
          events: ['entry.create'],
          contentTypeEvents: { [ARTICLE_UID]: ['entry.publish'] },
          enabled: true,
        },
      });
      expect(created).toMatchObject({
        name: webhook.name,
        events: ['entry.create'],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.publish'] },
        isEnabled: true,
      });
    });

    test('Saves no per content type events when none is given', async () => {
      const { store, query } = setup();
      const webhook = createWebhook();
      query.create.mockResolvedValue(toRow(webhook));

      await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ contentTypeEvents: {} }),
      });
    });

    test('Rejects an unsupported event listed for a content type', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({
        events: [],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.explode'] },
      });

      await expect(store.createWebhook(webhook)).rejects.toThrow(
        'Webhook event entry.explode is not supported'
      );
      expect(query.create).not.toHaveBeenCalled();
    });
  });

  describe('updateWebhook', () => {
    test('Validates the per content type events and saves them', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({
        isEnabled: false,
        contentTypeEvents: { [PAGE_UID]: ['entry.delete'] },
      });
      query.update.mockResolvedValue(toRow(webhook));

      const updated = await store.updateWebhook('1', webhook);

      expect(query.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          contentTypeEvents: { [PAGE_UID]: ['entry.delete'] },
          enabled: false,
        }),
      });
      expect(updated).toMatchObject({
        contentTypeEvents: { [PAGE_UID]: ['entry.delete'] },
        isEnabled: false,
      });
    });

    test('Rejects an unsupported event listed for a content type', async () => {
      const { store, query } = setup();

      await expect(
        store.updateWebhook(
          '1',
          createWebhook({ contentTypeEvents: { [PAGE_UID]: ['entry.explode'] } })
        )
      ).rejects.toThrow('Webhook event entry.explode is not supported');
      expect(query.update).not.toHaveBeenCalled();
    });

    test('Returns null when the webhook does not exist', async () => {
      const { store, query } = setup();
      query.update.mockResolvedValue(null);

      await expect(store.updateWebhook('404', createWebhook())).resolves.toBeNull();
    });
  });

  describe('findWebhooks / findWebhook', () => {
    test('Defaults the per content type events of webhooks saved before they existed', async () => {
      const { store, query } = setup();
      const webhook = createWebhook();
      query.findMany.mockResolvedValue([toRow(webhook, { contentTypeEvents: null })]);
      query.findOne.mockResolvedValue(toRow(webhook, { contentTypeEvents: null }));

      const [found] = await store.findWebhooks();
      const foundOne = await store.findWebhook('1');

      expect(found).toMatchObject({ contentTypeEvents: {}, isEnabled: true });
      expect(foundOne).toMatchObject({ contentTypeEvents: {}, isEnabled: true });
    });

    test('Returns the saved per content type events', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ contentTypeEvents: { [ARTICLE_UID]: ['entry.publish'] } });
      query.findOne.mockResolvedValue(toRow(webhook));

      await expect(store.findWebhook('1')).resolves.toMatchObject({
        contentTypeEvents: { [ARTICLE_UID]: ['entry.publish'] },
      });
    });

    test('Returns null when the webhook does not exist', async () => {
      const { store, query } = setup();
      query.findOne.mockResolvedValue(null);

      await expect(store.findWebhook('404')).resolves.toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    test('Returns the deleted webhook, or null when it does not exist', async () => {
      const { store, query } = setup();
      const webhook = createWebhook();
      query.delete.mockResolvedValueOnce(toRow(webhook)).mockResolvedValueOnce(null);

      await expect(store.deleteWebhook('1')).resolves.toMatchObject({ name: webhook.name });
      await expect(store.deleteWebhook('404')).resolves.toBeNull();
    });
  });
});
