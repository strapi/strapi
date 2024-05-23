import type { Core } from '@strapi/types';

// Helpers
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

import type { Settings } from '../../../../packages/core/content-releases/shared/contracts/settings';

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rq: any;
let rqEditor: any;

const getSettings = async (request = rq) => {
  return request({
    url: '/content-releases/settings',
    method: 'GET',
  }).then((res: any) => ({
    settings: res.body?.data,
    status: res.statusCode,
  }));
};

const updateSettings = async (settings: Settings, request = rq) => {
  return request({
    url: '/content-releases/settings',
    method: 'PUT',
    body: settings,
  }).then((res: any) => ({
    settings: res.body?.data,
    status: res.statusCode,
    error: res.error,
  }));
};

describe('Content releases settings', () => {
  beforeAll(async () => {
    await builder.build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  beforeEach(async () => {
    // Reset settings
    const store = await strapi.store({ type: 'core', name: 'content-releases' });
    await store.set({ key: 'settings', value: null });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Find settings', async () => {
    test('Find settings when there is none set', async () => {
      const { status, settings } = await getSettings();

      // Settings should be the default ones
      expect(status).toBe(200);
      expect(settings).toEqual({ defaultTimezone: null });
    });

    test('Find settings', async () => {
      // Set settings
      await updateSettings({ defaultTimezone: 'Europe/Paris' });

      const { status, settings } = await getSettings();

      // Settings should be the default ones
      expect(status).toBe(200);
      expect(settings).toEqual({ defaultTimezone: 'Europe/Paris' });
    });
  });

  describe('Update settings', async () => {
    test('Can update settings', async () => {
      // Set settings
      const { status, settings } = await updateSettings({ defaultTimezone: 'Europe/Paris' });

      // Returned settings should be the updated ones
      expect(status).toBe(200);
      expect(settings).toEqual({ defaultTimezone: 'Europe/Paris' });
    });

    test('Can update timezone to null', async () => {
      // Set settings
      await updateSettings({ defaultTimezone: 'Europe/Paris' });
      const { status, settings } = await updateSettings({ defaultTimezone: null });

      // Returned settings should be the updated ones
      expect(status).toBe(200);
      expect(settings).toEqual({ defaultTimezone: null });
    });

    test('Update settings with invalid data should throw', async () => {
      const { status } = await updateSettings({
        // @ts-expect-error - Invalid data
        other: 'value',
      });

      // Should throw a validation error
      expect(status).toBe(400);
    });
  });
});
