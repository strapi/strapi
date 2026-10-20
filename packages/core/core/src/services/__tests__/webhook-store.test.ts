import type { Modules } from '@strapi/types';

import { createWebhookStore } from '../webhook-store';

type Webhook = Modules.WebhookStore.Webhook;

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
  body: webhook.body ?? null,
  bodyMode: webhook.bodyMode ?? 'merge',
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
    test('Saves the body template', async () => {
      const { store, query } = setup();
      const body = { ref: 'main', inputs: { title: '{{ entry.title }}' } };
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
          bodyMode: 'merge',
          enabled: true,
        },
      });
      expect(created).toMatchObject({
        name: webhook.name,
        body,
        bodyMode: 'merge',
        isEnabled: true,
      });
    });

    test('Saves a null body and the merge mode when none is given', async () => {
      const { store, query } = setup();
      const webhook = createWebhook();
      query.create.mockResolvedValue(toRow(webhook));

      const created = await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: null, bodyMode: 'merge' }),
      });
      expect(created).toMatchObject({ body: null, bodyMode: 'merge' });
    });

    test('Saves the replace mode', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ body: { ref: 'main' }, bodyMode: 'replace' });
      query.create.mockResolvedValue(toRow(webhook));

      const created = await store.createWebhook(webhook);

      expect(query.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: { ref: 'main' }, bodyMode: 'replace' }),
      });
      expect(created.bodyMode).toBe('replace');
    });

    test('Rejects an unsupported event', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ events: ['entry.explode'] });

      await expect(store.createWebhook(webhook)).rejects.toThrow(
        'Webhook event entry.explode is not supported'
      );
      expect(query.create).not.toHaveBeenCalled();
    });
  });

  describe('updateWebhook', () => {
    test('Saves the new body template', async () => {
      const { store, query } = setup();
      const webhook = createWebhook({ isEnabled: false, body: { text: '{{ entry.title }}' } });
      query.update.mockResolvedValue(toRow(webhook));

      const updated = await store.updateWebhook('1', webhook);

      expect(query.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ body: { text: '{{ entry.title }}' }, enabled: false }),
      });
      expect(updated).toMatchObject({ body: { text: '{{ entry.title }}' }, isEnabled: false });
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
  });

  describe('findWebhooks', () => {
    test('Reads a null body and the merge mode for webhooks saved before the body could be customized', async () => {
      const { store, query } = setup();
      query.findMany.mockResolvedValue([
        toRow(createWebhook({ id: 1 as any }), { body: undefined, bodyMode: null }),
        toRow(createWebhook({ id: 2 as any, body: { ref: 'main' }, bodyMode: 'replace' })),
      ]);

      const webhooks = await store.findWebhooks();

      expect(webhooks).toEqual([
        expect.objectContaining({ id: '1', body: null, bodyMode: 'merge' }),
        expect.objectContaining({ id: '2', body: { ref: 'main' }, bodyMode: 'replace' }),
      ]);
    });
  });
});
