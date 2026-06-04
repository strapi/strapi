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

  describe('validateRolePermissionsLocales', () => {
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

    test('rejects enabled permissions on localized content types with empty locales', async () => {
      const { validateRolePermissionsLocales } = actionsService;

      await expect(
        validateRolePermissionsLocales([
          {
            action: 'plugin::content-manager.explorer.read',
            subject: localizedModel.uid,
            properties: {
              fields: ['title'],
              locales: [],
            },
          },
        ])
      ).rejects.toThrow('Permissions must apply to at least one locale.');
    });

    test('allows permissions with null locales', async () => {
      const { validateRolePermissionsLocales } = actionsService;

      await expect(
        validateRolePermissionsLocales([
          {
            action: 'plugin::content-manager.explorer.read',
            subject: localizedModel.uid,
            properties: {
              fields: ['title'],
              locales: null,
            },
          },
        ])
      ).resolves.toBeUndefined();
    });

    test('allows permissions when locales do not apply to the action', async () => {
      global.strapi.admin.services.permission.actionProvider.appliesToProperty = jest.fn(() =>
        Promise.resolve(false)
      );

      const { validateRolePermissionsLocales } = actionsService;

      await expect(
        validateRolePermissionsLocales([
          {
            action: 'plugin::content-manager.explorer.create',
            subject: localizedModel.uid,
            properties: {
              fields: ['title'],
              locales: [],
            },
          },
        ])
      ).resolves.toBeUndefined();
    });

    test('allows permissions with selected locales', async () => {
      const { validateRolePermissionsLocales } = actionsService;

      await expect(
        validateRolePermissionsLocales([
          {
            action: 'plugin::content-manager.explorer.read',
            subject: localizedModel.uid,
            properties: {
              fields: ['title'],
              locales: ['en'],
            },
          },
        ])
      ).resolves.toBeUndefined();
    });
  });

  describe('repairLegacyPermissionsWithLocales', () => {
    const explorerReadAction = 'plugin::content-manager.explorer.read';

    const setupRepairMocks = ({
      findMany,
      appliesToProperty = jest.fn(() => Promise.resolve(true)),
    }: {
      findMany: jest.Mock;
      appliesToProperty?: jest.Mock;
    }) => {
      const update = jest.fn();

      global.strapi = {
        getModel: jest.fn(() => localizedModel),
        contentTypes: {
          [localizedModel.uid]: localizedModel,
        },
        admin: {
          services: {
            permission: {
              findMany,
              actionProvider: {
                appliesToProperty,
              },
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

    test('patches permissions with missing locales on localized content types', async () => {
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

      const { repairLegacyPermissionsWithLocales } = actionsService;

      await repairLegacyPermissionsWithLocales();

      expect(update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          properties: {
            fields: ['title'],
            locales: ['en'],
          },
        },
      });
    });

    test('does not patch permissions that already have locales selected', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 2,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: ['en'] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      const { repairLegacyPermissionsWithLocales } = actionsService;

      await repairLegacyPermissionsWithLocales();

      expect(update).not.toHaveBeenCalled();
    });

    test('patches permissions with empty locales arrays on localized content types', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 3,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: [] },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      const { repairLegacyPermissionsWithLocales } = actionsService;

      await repairLegacyPermissionsWithLocales();

      expect(update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          properties: {
            fields: ['title'],
            locales: ['en'],
          },
        },
      });
    });

    test('does not patch permissions when locales do not apply to the action', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 4,
            action: 'plugin::content-manager.explorer.create',
            subject: localizedModel.uid,
            properties: { fields: ['title'] },
          },
        ])
      );

      const { update } = setupRepairMocks({
        findMany,
        appliesToProperty: jest.fn(() => Promise.resolve(false)),
      });

      const { repairLegacyPermissionsWithLocales } = actionsService;

      await repairLegacyPermissionsWithLocales();

      expect(update).not.toHaveBeenCalled();
    });

    test('does not patch permissions with null locales (all locales)', async () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 5,
            action: explorerReadAction,
            subject: localizedModel.uid,
            properties: { fields: ['title'], locales: null },
          },
        ])
      );

      const { update } = setupRepairMocks({ findMany });

      const { repairLegacyPermissionsWithLocales } = actionsService;

      await repairLegacyPermissionsWithLocales();

      expect(update).not.toHaveBeenCalled();
    });
  });
});
