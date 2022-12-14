'use strict';

jest.mock('@strapi/strapi/lib/utils/ee', () => {
  const eeModule = () => false;

  Object.assign(eeModule, {
    features: {
      isEnabled() {
        return false;
      },
      getEnabled() {
        return [];
      },
    },
  });

  return eeModule;
});

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
            'project-settings': {
              getProjectSettings: jest.fn(() => ({ menuLogo: null })),
            },
          },
        },
      };
    });

    test('Returns the uuid and if the app has admins', async () => {
      const result = await adminController.init();

      expect(global.strapi.config.get).toHaveBeenCalledWith('uuid', false);
      expect(global.strapi.config.get).toHaveBeenCalledWith(
        'packageJsonStrapi.telemetryDisabled',
        null
      );
      expect(global.strapi.admin.services.user.exists).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        uuid: 'foo',
        hasAdmin: true,
        menuLogo: null,
      });
    });
  });

  describe('information', () => {
    beforeAll(() => {
      global.strapi = {
        config: {
          get: jest.fn(
            (key, value) =>
              ({
                autoReload: undefined,
                'info.strapi': '1.0.0',
                'info.dependencies': {
                  dependency: '1.0.0',
                },
                uuid: 'testuuid',
                environment: 'development',
              }[key] || value)
          ),
        },
        EE: true,
      };
    });

    test('Returns application information', async () => {
      const result = await adminController.information();

      expect(global.strapi.config.get.mock.calls).toEqual([
        ['environment'],
        ['autoReload', false],
        ['info.strapi', null],
        ['info.dependencies', {}],
        ['uuid', null],
      ]);
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        currentEnvironment: 'development',
        autoReload: false,
        strapiVersion: '1.0.0',
        projectId: 'testuuid',
        dependencies: {
          dependency: '1.0.0',
        },
        nodeVersion: process.version,
        communityEdition: false,
        useYarn: true,
      });
    });
  });
});
