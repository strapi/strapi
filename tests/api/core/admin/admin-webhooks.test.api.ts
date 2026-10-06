import http from 'http';
import type { AddressInfo } from 'net';

import type { Webhook, LoadedStrapi } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const builder = createTestBuilder();
let rq;
let strapi: LoadedStrapi;

const ARTICLE_UID = 'api::webhook-article.webhook-article';
const PAGE_UID = 'api::webhook-page.webhook-page';

const createModel = (name: string) => ({
  draftAndPublish: false,
  singularName: name,
  pluralName: `${name}s`,
  displayName: name,
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
});

const defaultWebhook = {
  name: 'test',
  url: 'https://example.com',
  headers: {},
  events: [],
} satisfies Omit<Webhook, 'id' | 'isEnabled'>;

const createWebhook = async (webhook: Partial<Webhook>) => {
  const res = await rq({
    url: '/admin/webhooks',
    method: 'POST',
    body: {
      ...defaultWebhook,
      ...webhook,
    },
  });

  return {
    status: res.statusCode,
    webhook: res.body.data,
  };
};

const updateWebhook = async (id: string, webhook: Partial<Webhook>) => {
  const res = await rq({
    url: `/admin/webhooks/${id}`,
    method: 'PUT',
    body: {
      ...defaultWebhook,
      ...webhook,
    },
  });

  return {
    status: res.statusCode,
    webhook: res.body.data,
  };
};

const deleteWebhook = async (id: string) => {
  const res = await rq({
    url: `/admin/webhooks/${id}`,
    method: 'DELETE',
  });

  return {
    status: res.statusCode,
    webhook: res.body.data,
  };
};

describe('Admin API Webhooks', () => {
  // Initialization Actions
  beforeAll(async () => {
    await builder
      .addContentTypes([createModel('webhook-article'), createModel('webhook-page')])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  // Cleanup actions
  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Can create a webhook', async () => {
    const { webhook, status } = await createWebhook({
      url: 'https://example.com',
    });

    expect(status).toBe(201);
    expect(webhook).toMatchObject({
      id: expect.anything(),
      ...defaultWebhook,
      url: 'https://example.com',
    });
  });

  test('Can not create a webhook with a local url on production', async () => {
    // change NODE_ENV to 'production' to test this
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { status } = await createWebhook({ url: 'http://localhost:1337' });
    const { status: statusInt } = await createWebhook({ url: '私の.家' });

    process.env.NODE_ENV = originalNodeEnv;

    expect(status).toBe(400);
    expect(statusInt).toBe(400);
  });

  test('Can not create a webhook with an invalid url', async () => {
    const { status } = await createWebhook({
      url: 'invalid-url',
    });

    expect(status).toBe(400);
  });

  test('Can update a webhook', async () => {
    const { webhook: createdWebhook } = await createWebhook({
      url: 'https://example.com',
    });

    const { webhook, status } = await updateWebhook(createdWebhook.id, {
      url: 'https://example.com/updated',
    });

    expect(status).toBe(200);
    expect(webhook).toMatchObject({
      id: createdWebhook.id,
      ...defaultWebhook,
      url: 'https://example.com/updated',
    });
  });

  test('Can delete a webhook', async () => {
    const { webhook: createdWebhook } = await createWebhook({
      url: 'https://example.com',
    });

    const { webhook, status } = await deleteWebhook(createdWebhook.id);

    expect(status).toBe(200);
    expect(webhook).toMatchObject({
      id: createdWebhook.id,
      url: 'https://example.com',
      ...defaultWebhook,
    });
  });

  describe('Content type events', () => {
    test('A webhook has no content type events by default', async () => {
      const { webhook, status } = await createWebhook({});

      expect(status).toBe(201);
      expect(webhook.contentTypeEvents).toEqual({});
    });

    test('Can select events per content type', async () => {
      const { webhook: createdWebhook, status } = await createWebhook({
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
      });

      expect(status).toBe(201);
      expect(createdWebhook.contentTypeEvents).toEqual({ [ARTICLE_UID]: ['entry.create'] });

      const contentTypeEvents = {
        [ARTICLE_UID]: ['entry.create', 'entry.update'],
        [PAGE_UID]: ['entry.delete'],
      };
      const { webhook, status: updateStatus } = await updateWebhook(createdWebhook.id, {
        contentTypeEvents,
      });

      expect(updateStatus).toBe(200);
      expect(webhook.contentTypeEvents).toEqual(contentTypeEvents);
    });

    test('Events selected for every content type are not saved per content type', async () => {
      const { webhook } = await createWebhook({
        events: ['entry.create'],
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create', 'entry.update'], [PAGE_UID]: [] },
      });

      expect(webhook.events).toEqual(['entry.create']);
      expect(webhook.contentTypeEvents).toEqual({ [ARTICLE_UID]: ['entry.update'] });
    });

    test('Updating a webhook without content type events keeps the saved ones', async () => {
      const { webhook: createdWebhook } = await createWebhook({
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
      });

      const { webhook, status } = await updateWebhook(createdWebhook.id, { name: 'renamed' });

      expect(status).toBe(200);
      expect(webhook).toMatchObject({
        name: 'renamed',
        contentTypeEvents: { [ARTICLE_UID]: ['entry.create'] },
      });
    });

    test('Can not select events for a content type that does not exist', async () => {
      const contentTypeEvents = { 'api::unknown.unknown': ['entry.create'] };
      const { status } = await createWebhook({ contentTypeEvents });

      expect(status).toBe(400);

      const { webhook: createdWebhook } = await createWebhook({});
      const { status: updateStatus } = await updateWebhook(createdWebhook.id, {
        contentTypeEvents,
      });

      expect(updateStatus).toBe(400);
    });

    test('Can not select an unsupported event for a content type', async () => {
      const { status } = await createWebhook({
        contentTypeEvents: { [ARTICLE_UID]: ['entry.unknown'] },
      });

      expect(status).toBe(400);
    });

    test.each([[['entry.create']], [{ [ARTICLE_UID]: 'entry.create' }], ['entry.create']])(
      'Can not create a webhook with invalid content type events (%j)',
      async (contentTypeEvents: any) => {
        const { status } = await createWebhook({ contentTypeEvents });

        expect(status).toBe(400);
      }
    );

    test('Entry events are sent according to the events selected per content type', async () => {
      const requests: Array<{ url: string; delivery: string }> = [];

      const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          const { event, uid } = JSON.parse(body);
          requests.push({ url: req.url, delivery: `${event} ${uid}` });
          res.end();
        });
      });

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
      });

      const { port } = server.address() as AddressInfo;
      const getDeliveries = (url: string) =>
        requests
          .filter((req) => req.url === url)
          .map((req) => req.delivery)
          .sort();

      try {
        // For each event, webhooks are sent one after the other, in the order they were created.
        // So once the second webhook received an event, the first one was already handled.
        await createWebhook({
          url: `http://127.0.0.1:${port}/per-content-type`,
          events: [],
          contentTypeEvents: { [ARTICLE_UID]: ['entry.create'], [PAGE_UID]: ['entry.update'] },
        });
        await createWebhook({
          url: `http://127.0.0.1:${port}/all`,
          events: ['entry.create', 'entry.update'],
        });

        const page = await strapi.documents(PAGE_UID as any).create({ data: { name: 'page' } });
        const article = await strapi
          .documents(ARTICLE_UID as any)
          .create({ data: { name: 'article' } });

        await strapi
          .documents(PAGE_UID as any)
          .update({ documentId: page.documentId, data: { name: 'updated' } as any });
        await strapi
          .documents(ARTICLE_UID as any)
          .update({ documentId: article.documentId, data: { name: 'updated' } as any });

        const timeout = Date.now() + 10000;
        while (getDeliveries('/all').length < 4 && Date.now() < timeout) {
          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        }

        expect(getDeliveries('/all')).toEqual([
          `entry.create ${ARTICLE_UID}`,
          `entry.create ${PAGE_UID}`,
          `entry.update ${ARTICLE_UID}`,
          `entry.update ${PAGE_UID}`,
        ]);
        expect(getDeliveries('/per-content-type')).toEqual([
          `entry.create ${ARTICLE_UID}`,
          `entry.update ${PAGE_UID}`,
        ]);
      } finally {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }
    });
  });
});
