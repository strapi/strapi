import type { Webhook, LoadedStrapi } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

let rq;
let strapi: LoadedStrapi;

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
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  // Cleanup actions
  afterAll(async () => {
    await strapi.destroy();
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
});
