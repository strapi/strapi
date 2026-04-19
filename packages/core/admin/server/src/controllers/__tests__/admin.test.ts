import adminController from '../admin';

describe('Admin Controller', () => {
  describe('init', () => {
    const makeStrapi = (configOverrides: Record<string, unknown> = {}) => {
      const configValues: Record<string, unknown> = {
        uuid: 'test-uuid',
        'admin.register.enabled': true,
        'packageJsonStrapi.telemetryDisabled': null,
        ...configOverrides,
      };
      return {
        ee: {
          features: {
            isEnabled() {
              return false;
            },
            list() {
              return [];
            },
          },
        },
        config: {
          get: jest.fn((key: string, def?: unknown) =>
            key in configValues ? configValues[key] : def
          ),
        },
        admin: {
          services: {
            user: {
              exists: jest.fn(() => true),
            },
            'project-settings': {
              getProjectSettings: jest.fn(() => ({ menuLogo: null, authLogo: null })),
            },
          },
        },
      } as any;
    };

    test('returns uuid, hasAdmin, and registerEnabled (default true)', async () => {
      global.strapi = makeStrapi();

      const result = await adminController.init();

      expect(global.strapi.config.get).toHaveBeenCalledWith('admin.register.enabled', true);
      expect(global.strapi.service('admin::user').exists).toHaveBeenCalled();
      expect(result.data).toStrictEqual({
        uuid: 'test-uuid',
        hasAdmin: true,
        menuLogo: null,
        authLogo: null,
        registerEnabled: true,
      });
    });

    test('returns registerEnabled: false when admin.register.enabled is disabled', async () => {
      global.strapi = makeStrapi({ 'admin.register.enabled': false });

      const result = await adminController.init();

      expect(result.data.registerEnabled).toBe(false);
    });
  });

  describe('information', () => {
    beforeAll(() => {
      global.strapi = {
        config: {
          get: jest.fn(
            (key: string, value) =>
              ({
                autoReload: undefined,
                'info.strapi': '1.0.0',
                'info.dependencies': {
                  dependency: '1.0.0',
                },
                uuid: 'testuuid',
                environment: 'development',
              })[key] || value
          ),
        },
        EE: true,
      } as any;
    });

    test('Returns application information', async () => {
      const result = await adminController.information();

      expect((global.strapi.config.get as jest.Mock).mock.calls).toEqual([
        ['environment'],
        ['autoReload', false],
        ['info.strapi', null],
        ['info.dependencies', {}],
        ['uuid', null],
      ]);
      expect(result.data).toBeDefined();
      expect(result.data).toMatchObject({
        currentEnvironment: 'development',
        autoReload: false,
        strapiVersion: '1.0.0',
        projectId: 'testuuid',
        dependencies: {
          dependency: '1.0.0',
        },
        nodeVersion: process.version,
        communityEdition: false,
      });
    });
  });
});
