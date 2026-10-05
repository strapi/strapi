import actionsService from '../actions';

const mockGetService = jest.fn();

jest.mock('../../../utils', () => ({
  getService: (...args: unknown[]) => mockGetService(...args),
}));

describe('i18n permissions actions', () => {
  const localizedModel = {
    uid: 'api::article.article',
    pluginOptions: { i18n: { localized: true } },
  };

  const setupCommonMocks = () => {
    mockGetService.mockImplementation((serviceName: string) => {
      if (serviceName === 'locales') {
        return {
          getDefaultLocale: jest.fn(() => Promise.resolve('en')),
        };
      }

      if (serviceName === 'content-types') {
        return {
          isLocalizedContentType: jest.fn(
            (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
              model?.pluginOptions?.i18n?.localized === true
          ),
        };
      }

      return undefined;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupCommonMocks();
  });

  describe('normalizeRolePermissionsLocales', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid: string) => {
          if (uid === localizedModel.uid) {
            return localizedModel;
          }

          return undefined;
        }),
        admin: {
          services: {
            permission: {
              actionProvider: {
                appliesToProperty: jest.fn(() => Promise.resolve(true)),
              },
            },
          },
        },
      } as any;
    });

    test('fills in default locale for permissions with empty locales', async () => {
      const { normalizeRolePermissionsLocales } = actionsService;

      const result = await normalizeRolePermissionsLocales([
        {
          action: 'plugin::content-manager.explorer.read',
          subject: localizedModel.uid,
          properties: { fields: ['title'], locales: [] },
        },
      ]);

      expect(result[0].properties.locales).toEqual(['en']);
    });

    test('fills in default locale for permissions with missing locales', async () => {
      const { normalizeRolePermissionsLocales } = actionsService;

      const result = await normalizeRolePermissionsLocales([
        {
          action: 'plugin::content-manager.explorer.read',
          subject: localizedModel.uid,
          properties: { fields: ['title'] },
        },
      ]);

      expect(result[0].properties.locales).toEqual(['en']);
    });

    test('leaves permissions with null locales unchanged', async () => {
      const { normalizeRolePermissionsLocales } = actionsService;

      const permission = {
        action: 'plugin::content-manager.explorer.read',
        subject: localizedModel.uid,
        properties: { fields: ['title'], locales: null },
      };

      const result = await normalizeRolePermissionsLocales([permission]);

      expect(result[0].properties.locales).toBeNull();
    });

    test('leaves permissions unchanged when locales do not apply to the action', async () => {
      global.strapi.admin.services.permission.actionProvider.appliesToProperty = jest.fn(() =>
        Promise.resolve(false)
      );

      const { normalizeRolePermissionsLocales } = actionsService;

      const permission = {
        action: 'plugin::content-manager.explorer.create',
        subject: localizedModel.uid,
        properties: { fields: ['title'], locales: [] },
      };

      const result = await normalizeRolePermissionsLocales([permission]);

      expect(result[0].properties.locales).toEqual([]);
    });

    test('leaves permissions with selected locales unchanged', async () => {
      const { normalizeRolePermissionsLocales } = actionsService;

      const permission = {
        action: 'plugin::content-manager.explorer.read',
        subject: localizedModel.uid,
        properties: { fields: ['title'], locales: ['en'] },
      };

      const result = await normalizeRolePermissionsLocales([permission]);

      expect(result[0].properties.locales).toEqual(['en']);
    });

    test('leaves non-localized content type permissions unchanged', async () => {
      const { normalizeRolePermissionsLocales } = actionsService;

      const permission = {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::non-localized.non-localized',
        properties: { fields: ['title'] },
      };

      const result = await normalizeRolePermissionsLocales([permission]);

      expect(result[0]).toBe(permission);
    });
  });

  describe('repairPermissionsForNewlyLocalizedTypes', () => {
    const explorerReadAction = 'plugin::content-manager.explorer.read';

    const nonLocalizedModel = {
      uid: 'api::article.article',
      pluginOptions: { i18n: { localized: false } },
    };

    const setupRepairMocks = ({ findMany }: { findMany: jest.Mock }) => {
      const update = jest.fn();

      global.strapi = {
        contentTypes: {
          [localizedModel.uid]: localizedModel,
        },
        admin: {
          services: {
            permission: {
              findMany,
            },
          },
        },
        db: {
          query: jest.fn(() => ({ update })),
        },
        log: {
          error: jest.fn(),
        },
      } as any;

      return { update };
    };

    const oldTypes = { [localizedModel.uid]: nonLocalizedModel };
    const newTypes = { [localizedModel.uid]: localizedModel };

    test('patches permissions with missing locales when i18n is just enabled', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 1,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { properties: { fields: ['title'], locales: ['en'] } },
      });
    });

    test('patches permissions with empty locales when i18n is just enabled', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 2,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: [] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { properties: { fields: ['title'], locales: ['en'] } },
      });
    });

    test('does not patch permissions that already have locales selected', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 3,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: ['en'] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).not.toHaveBeenCalled();
    });

    test('does not patch permissions with null locales (all locales)', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 4,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: null },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).not.toHaveBeenCalled();
    });

    test('does not patch permissions when the content type was already localized', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 5,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      // Both old and new are already localized — not a newly-localized type
      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: { [localizedModel.uid]: localizedModel },
        contentTypes: newTypes,
      });

      expect(update).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
    });

    test('does nothing when oldContentTypes is null', async () => {
      const findMany = jest.fn();
      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: null,
        contentTypes: newTypes,
      });

      expect(update).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
    });

    test('does nothing when getDefaultLocale returns null', async () => {
      mockGetService.mockImplementation((serviceName: string) => {
        if (serviceName === 'locales') {
          return { getDefaultLocale: jest.fn(() => Promise.resolve(null)) };
        }
        if (serviceName === 'content-types') {
          return {
            isLocalizedContentType: jest.fn(
              (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
                model?.pluginOptions?.i18n?.localized === true
            ),
          };
        }
        return undefined;
      });

      const findMany = jest.fn(() => Promise.resolve([]));
      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).not.toHaveBeenCalled();
    });

    test('patches permissions whose properties object is undefined', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 10,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: undefined,
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      await actionsService.repairPermissionsForNewlyLocalizedTypes({
        oldContentTypes: oldTypes,
        contentTypes: newTypes,
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { properties: { locales: ['en'] } },
      });
    });

    test('logs an error and does not throw when an internal operation fails', async () => {
      const findMany = jest.fn(() => Promise.reject(new Error('DB failure')));
      const { update } = setupRepairMocks({ findMany });

      await expect(
        actionsService.repairPermissionsForNewlyLocalizedTypes({
          oldContentTypes: oldTypes,
          contentTypes: newTypes,
        })
      ).resolves.toBeUndefined();

      expect(update).not.toHaveBeenCalled();
      expect((global.strapi as any).log.error).toHaveBeenCalled();
    });
  });
});
