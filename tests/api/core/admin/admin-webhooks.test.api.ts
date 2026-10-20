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

const articleModel = {
  draftAndPublish: false,
  singularName: 'webhook-article',
  pluralName: 'webhook-articles',
  displayName: 'webhook-article',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

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
    await builder.addContentTypes([articleModel]).build();

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

  describe('Body template', () => {
    const template = {
      ref: 'main',
      inputs: { event: '{{ event }}', uid: '{{ uid }}', title: '{{ entry.title }}' },
      entry: '{{ entry }}',
    };

    test('A webhook sends the default payload by default', async () => {
      const { webhook, status } = await createWebhook({});

      expect(status).toBe(201);
      expect(webhook).toMatchObject({ body: null, bodyMode: 'merge' });
    });

    test('Can save a body template and its mode', async () => {
      const { webhook: createdWebhook, status } = await createWebhook({ body: template });

      expect(status).toBe(201);
      expect(createdWebhook).toMatchObject({ body: template, bodyMode: 'merge' });

      const { webhook, status: updateStatus } = await updateWebhook(createdWebhook.id, {
        body: { text: 'Published: {{ entry.title }}' },
        bodyMode: 'replace',
      });

      expect(updateStatus).toBe(200);
      expect(webhook).toMatchObject({
        body: { text: 'Published: {{ entry.title }}' },
        bodyMode: 'replace',
      });
    });

    test('Can not save an unknown body mode', async () => {
      const { status } = await createWebhook({ body: template, bodyMode: 'append' as any });

      expect(status).toBe(400);
    });

    test('Updating a webhook without a body keeps the saved template', async () => {
      const { webhook: createdWebhook } = await createWebhook({ body: template });

      const { webhook, status } = await updateWebhook(createdWebhook.id, { name: 'renamed' });

      expect(status).toBe(200);
      expect(webhook).toMatchObject({ name: 'renamed', body: template });
    });

    test('Can go back to the default payload with a null body', async () => {
      const { webhook: createdWebhook } = await createWebhook({ body: template });

      const { webhook, status } = await updateWebhook(createdWebhook.id, { body: null });

      expect(status).toBe(200);
      expect(webhook.body).toBeNull();
    });

    test.each([[['ref']], ['{"ref":"main"}'], [42], [true]])(
      'Can not save a body that is not a JSON object (%j)',
      async (body: any) => {
        const { status } = await createWebhook({ body });

        expect(status).toBe(400);
      }
    );

    test('Entry events are sent with the rendered body template', async () => {
      const requests: Array<{ url: string; body: Record<string, unknown> }> = [];

      const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          requests.push({ url: req.url, body: JSON.parse(body) });
          res.end();
        });
      });

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
      });

      const { port } = server.address() as AddressInfo;
      const getDeliveries = (url: string) =>
        requests.filter((req) => req.url === url).map((req) => req.body);

      try {
        await createWebhook({
          url: `http://127.0.0.1:${port}/merge`,
          events: ['entry.create'],
          body: template,
        });
        await createWebhook({
          url: `http://127.0.0.1:${port}/replace`,
          events: ['entry.create'],
          body: template,
          bodyMode: 'replace',
        });
        // For each event, webhooks are sent one after the other, in the order they were created.
        // So once the last webhook received the event, the other ones were already handled.
        await createWebhook({
          url: `http://127.0.0.1:${port}/default`,
          events: ['entry.create'],
        });

        const article = await strapi
          .documents(ARTICLE_UID as any)
          .create({ data: { title: 'Hello' } });

        const timeout = Date.now() + 10000;
        while (getDeliveries('/default').length < 1 && Date.now() < timeout) {
          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        }

        const entry = expect.objectContaining({ documentId: article.documentId, title: 'Hello' });
        const defaultPayload = {
          event: 'entry.create',
          createdAt: expect.any(String),
          model: 'webhook-article',
          uid: ARTICLE_UID,
          entry,
        };
        const rendered = {
          ref: 'main',
          inputs: { event: 'entry.create', uid: ARTICLE_UID, title: 'Hello' },
          entry,
        };

        expect(getDeliveries('/default')).toEqual([defaultPayload]);
        expect(getDeliveries('/merge')).toEqual([{ ...defaultPayload, ...rendered }]);
        expect(getDeliveries('/replace')).toEqual([rendered]);
      } finally {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }
    });
  });
});
