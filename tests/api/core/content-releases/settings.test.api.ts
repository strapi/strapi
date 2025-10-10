import type { Core } from '@strapi/types';

// Helpers
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils, describeOnCondition } from 'api-tests/utils';

import type { Settings } from '../../../../packages/core/content-releases/shared/contracts/settings';

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rq: any;
let rqUnauth: any;
let rqReader: any;
let rqEditor: any;

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

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

/**
 * Creates a request utility with a user having the specified role and permissions
 */
const createUserRequest = async (params: { user; role; permissions }, utils) => {
  // Create user role
  const role = await utils.createRole(params.role);

  // Assign permissions
  const permissions = await utils.assignPermissionsToRole(role.id, params.permissions);
  Object.assign(role, permissions);

  // Create user
  const createdUser = await utils.createUser({
    ...params.user,
    roles: [role.id],
    password: '1234',
  });

  // Return request
  return createAuthRequest({ strapi, userInfo: createdUser });
};

describeOnCondition(edition === 'EE')('Content releases settings', () => {
  beforeAll(async () => {
    await builder.build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    const utils = createUtils(strapi);

    /**
     * Unauthorized role
     */
    rqUnauth = await createUserRequest(
      {
        user: { firstname: 'Pepe', lastname: 'Frog', email: 'pepe.frog@test.com' },
        role: { name: 'noAuth' },
        permissions: [],
      },
      utils
    );

    /**
     * Reader role
     */
    rqReader = await createUserRequest(
      {
        user: { firstname: 'Alice', lastname: 'Foo', email: 'alice.foo@test.com' },
        role: { name: 'reader' },
        permissions: [
          {
            action: 'plugin::content-releases.settings.read',
            subject: null,
            conditions: [],
            properties: {},
          },
        ],
      },
      utils
    );

    /**
     * Full access role
     */
    rqEditor = await createUserRequest(
      {
        user: { firstname: 'Bob', lastname: 'Bar', email: 'bob.bar@test.com' },
        role: { name: 'editor' },
        permissions: [
          { action: 'plugin::content-releases.settings.read' },
          { action: 'plugin::content-releases.settings.update' },
        ],
      },
      utils
    );
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

  describe('Find settings', () => {
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

  describe('Update settings', () => {
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

  describe('Permissions', () => {
    test('Unauthorized user cannot read settings', async () => {
      const { status } = await getSettings(rqUnauth);

      expect(status).toBe(403);
    });

    test('Unauthorized user cannot update settings', async () => {
      const { status } = await updateSettings({ defaultTimezone: 'Europe/Paris' }, rqUnauth);

      expect(status).toBe(403);
    });

    test('Reader can read settings', async () => {
      const { status } = await getSettings(rqReader);

      expect(status).toBe(200);
    });

    test('Reader cannot update settings', async () => {
      const { status } = await updateSettings({ defaultTimezone: 'Europe/Paris' }, rqReader);

      expect(status).toBe(403);
    });

    test('Editor can read settings', async () => {
      const { status } = await getSettings(rqEditor);

      expect(status).toBe(200);
    });

    test('Editor can update settings', async () => {
      const { status } = await updateSettings({ defaultTimezone: 'Europe/Paris' }, rqEditor);

      expect(status).toBe(200);
    });
  });
});
