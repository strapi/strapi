import { describe, test, expect, vi } from 'vitest';
import type { Modules } from '@strapi/types';

import { createWebhookStore } from '../webhook-store';

type Webhook = Modules.WebhookStore.Webhook;

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';

const createDb = () => {
  const query = {
    findMany: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const db = { query: vi.fn(() => query) };

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
  body: webhook.body ?? null,
  contentTypeEvents: webhook.contentTypeEvents ?? {},
  enabled: webhook.isEnabled,
  ...row,
});

const setup = ({ isBodyTemplateEnabled = true } = {}) => {
  const { db, query } = createDb();
  const store = createWebhookStore({
    db: db as any,
    isBodyTemplateEnabled: () => isBodyTemplateEnabled,
    getContentTypes: () =>
      ({ [ARTICLE_UID]: { attributes: { title: { type: 'string' } } } }) as any,
  });

  return { store, query };
};

describe('Webhook store', () => {
  describe('createWebhook', () => {
    test('Saves the body template', async () => {
      const { store, query } = setup();
      const body = { ref: 'main', inputs: { uid: '{{ uid }}' } };
      const webhook = createWebhook({ body });
      query.create.mockResolvedValue(toRow(webhook));

      const created = await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: {
          name: webhook.name,
          url: webhook.url,
          headers: webhook.headers,
          events: ['entry.create'],
          body,
          contentTypeEvents: {},
          enabled: true,
        },
      });
      expect(created).toMatchObject({
        name: webhook.name,
        body,
        isEnabled: true,
      });
    });

    test('Saves a null body when none is given', async () => {
      const { store, query } = setup();
      const webhook = createWebhook();
      query.create.mockResolvedValue(toRow(webhook));

      const created = await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: null }),
      });
      expect(created).toMatchObject({ body: null });
    });

    test('Rejects a body template that does not validate', async () => {
      const { store, query } = setup();

      await expect(
        store.createWebhook(createWebhook({ body: { value: '{{ entry.tags.0.name }}' } }))
      ).rejects.toThrow('can only be used when the events are selected per content type');
      await expect(store.createWebhook(createWebhook({ body: ['ref'] as any }))).rejects.toThrow(
        'Webhook body must be a JSON object'
      );
      expect(query.create).not.toHaveBeenCalled();
    });

    test('Ignores the body template when the flag is off', async () => {
      const { store, query } = setup({ isBodyTemplateEnabled: false });
      const webhook = createWebhook({ body: { value: '{{ unknown }}' } });
      query.create.mockResolvedValue(toRow(webhook, { body: null }));

      await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: null }),
      });
    });

    test('Rejects an unsupported event', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ events: ['entry.explode'] });

      await expect(store.createWebhook(webhook)).rejects.toThrow(
        'Webhook event entry.explode is not supported'
      );
      expect(query.create).not.toHaveBeenCalled();
    });

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
          body: null,
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
    test('Saves the new body template', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ isEnabled: false, body: { text: '{{ uid }}' } });
      query.update.mockResolvedValue(toRow(webhook));

      const updated = await store.updateWebhook('1', webhook);

      expect(query.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ body: { text: '{{ uid }}' }, enabled: false }),
      });
      expect(updated).toMatchObject({ body: { text: '{{ uid }}' }, isEnabled: false });
    });

    test('Resets the body to the default payload with null', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ body: null });
      query.update.mockResolvedValue(toRow(webhook));

      await store.updateWebhook('1', webhook);

      expect(query.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ body: null }),
      });
    });

    test('Rejects a new body template that does not validate', async () => {
      const { store, query } = setup();
      const saved = createWebhook({ body: { text: '{{ uid }}' } });
      query.findOne.mockResolvedValue(toRow(saved));

      await expect(
        store.updateWebhook('1', { ...saved, body: { text: '{{ unknown }}' } })
      ).rejects.toThrow('{{ unknown }} is not supported');
      expect(query.update).not.toHaveBeenCalled();
    });

    test('Rejects saved variables once the events make them unavailable', async () => {
      const { store, query } = setup();
      const saved = createWebhook({ body: { text: '{{ uid }}' } });
      query.findOne.mockResolvedValue(toRow(saved));
      store.addAllowedEvent('MEDIA_CREATE', 'media.create');

      await expect(
        store.updateWebhook('1', { ...saved, events: ['media.create'] })
      ).rejects.toThrow('not available for the event media.create');
      expect(query.update).not.toHaveBeenCalled();
    });

    test('Keeps a saved template editable once a field it uses is gone', async () => {
      const { store, query } = setup();
      const saved = createWebhook({
        events: [],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
        body: { text: '{{ entry.removed }}' },
      });
      query.findOne.mockResolvedValue(toRow(saved));
      query.update.mockResolvedValue(toRow(saved));

      await store.updateWebhook('1', { ...saved, isEnabled: false, name: 'Renamed' });

      expect(query.update).toHaveBeenCalled();
    });

    test('Keeps the saved template without changing it when the flag is off', async () => {
      const { store, query } = setup({ isBodyTemplateEnabled: false });
      const webhook = createWebhook({ body: null, isEnabled: false });
      query.update.mockResolvedValue(toRow(webhook, { body: { ref: 'main' } }));

      const updated = await store.updateWebhook('1', webhook);

      expect(query.update.mock.calls[0][0].data).not.toHaveProperty('body');
      expect(updated).toMatchObject({ body: { ref: 'main' }, isEnabled: false });
    });

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
    test('Reads a null body for webhooks saved before the body could be customized', async () => {
      const { store, query } = setup();
      query.findMany.mockResolvedValue([
        toRow(createWebhook({ id: 1 as any }), { body: undefined }),
        toRow(createWebhook({ id: 2 as any, body: { ref: 'main' } })),
      ]);

      const webhooks = await store.findWebhooks();

      expect(webhooks).toEqual([
        expect.objectContaining({ id: '1', body: null }),
        expect.objectContaining({ id: '2', body: { ref: 'main' } }),
      ]);
    });

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
