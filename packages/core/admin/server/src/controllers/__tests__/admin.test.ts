import adminController from '../admin';

describe('Admin Controller', () => {
  describe('init', () => {
    beforeAll(() => {
      global.strapi = {
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
          get: jest.fn(() => 'foo'),
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
    });

    test('Returns the uuid and if the app has admins', async () => {
      const result = await adminController.init();

      expect(global.strapi.config.get).toHaveBeenCalledWith('uuid', false);
      expect(global.strapi.config.get).toHaveBeenCalledWith(
        'packageJsonStrapi.telemetryDisabled',
        null
      );
      expect(global.strapi.service('admin::user').exists).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        uuid: 'foo',
        hasAdmin: true,
        menuLogo: null,
        authLogo: null,
      });
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
