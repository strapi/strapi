'use strict';

const adminController = require('../admin');

describe('Admin Controller', () => {
  describe('init', () => {
    beforeAll(() => {
      global.strapi = {
        config: {
          get: jest.fn(() => 'foo'),
        },
        admin: {
          services: {
            user: {
              exists: jest.fn(() => true),
            },
          },
        },
      };
    });

    test('Returns the uuid and if the app has admins', async () => {
      const result = await adminController.init();

      expect(global.strapi.config.get).toHaveBeenCalledWith('uuid', false);
      expect(global.strapi.admin.services.user.exists).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        uuid: 'foo',
        hasAdmin: true,
      });
    });
  });

  describe('information', () => {
    beforeAll(() => {
      global.strapi = {
        app: {
          env: 'development',
        },
        config: {
          get: jest.fn(
            (key, value) =>
              ({
                autoReload: undefined,
                'info.strapi': '1.0.0',
              }[key] || value)
          ),
        },
        EE: true,
      };
    });

    test('Returns application information', async () => {
      const result = await adminController.information();

      expect(global.strapi.config.get).toHaveBeenCalledTimes(2);
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        currentEnvironment: 'development',
        autoReload: false,
        strapiVersion: '1.0.0',
        nodeVersion: process.version,
        communityEdition: false,
      });
    });
  });
});
