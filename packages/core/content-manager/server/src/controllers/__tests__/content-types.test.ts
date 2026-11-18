// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import contentTypes from '../content-types';

jest.mock('../validation', () => ({
  createModelConfigurationSchema: jest.fn(() => ({
    validate: jest.fn(async (body: unknown) => body),
  })),
  validateKind: jest.fn(),
}));

describe('Content Types', () => {
  test('findContentTypesSettings', async () => {
    const contentTypeUid = 'test-content-type';
    const fakeConfig = {
      metadatas: {},
      layouts: {},
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'username',
        defaultSortBy: 'username',
        defaultSortOrder: 'ASC',
      },
    };

    global.strapi = {
      plugins: {
        'content-manager': {
          services: {
            'content-types': {
              findAllContentTypes() {
                return [{ uid: contentTypeUid }];
              },
              findConfiguration() {
                return {
                  uid: contentTypeUid,
                  ...fakeConfig,
                };
              },
            },
          },
        },
      },
    } as any;

    const ctx = createContext({});

    await contentTypes.findContentTypesSettings(ctx);

    expect(ctx.body).toStrictEqual({
      data: [
        {
          uid: contentTypeUid,
          settings: fakeConfig.settings,
        },
      ],
    });
  });

  describe('updateContentTypeConfiguration', () => {
    const uid = 'api::article.article';

    const setup = ({ isFeatureEnabled = true, isOrderable = true } = {}) => {
      const updateConfiguration = jest.fn(async (_contentType: unknown, input: any) => ({
        uid,
        ...input,
        metadatas: {},
        layouts: { list: [], edit: [] },
      }));
      const customOrder = {
        isOrderable: jest.fn(() => isOrderable),
        applySettings: jest.fn(async () => {}),
      };

      global.strapi = {
        features: { future: { isEnabled: () => isFeatureEnabled } },
        plugins: {
          'content-manager': {
            services: {
              'content-types': {
                findContentType: jest.fn(async () => ({ uid, kind: 'collectionType' })),
                updateConfiguration,
                findComponentsConfigurations: jest.fn(async () => ({})),
              },
              metrics: { sendDidConfigureListView: jest.fn(async () => {}) },
              permission: { canConfigureContentType: jest.fn(() => true) },
              'custom-order': customOrder,
            },
          },
        },
      } as any;
      // The test setup only resolves admin services by name
      (global.strapi as any).service = (name: string) =>
        name === 'plugin::content-manager.custom-order' ? customOrder : undefined;

      const ctx = {
        ...createContext({ params: { uid }, body: {} }),
        state: { userAbility: {} },
        badRequest: jest.fn(() => 'badRequest'),
        notFound: jest.fn(),
        forbidden: jest.fn(),
      } as any;

      return { ctx, updateConfiguration, customOrder };
    };

    test('Drops the custom order setting while the feature flag is off', async () => {
      const { ctx, updateConfiguration, customOrder } = setup({ isFeatureEnabled: false });
      ctx.request.body = { settings: { pageSize: 10, customOrder: true } };

      await contentTypes.updateContentTypeConfiguration(ctx);

      expect(updateConfiguration).toHaveBeenCalledWith(expect.objectContaining({ uid }), {
        settings: { pageSize: 10 },
      });
      expect(customOrder.applySettings).not.toHaveBeenCalled();
      expect(ctx.body.data.contentType.settings).toEqual({ pageSize: 10 });
    });

    test('Refuses to turn custom order on for a content type that cannot be ordered', async () => {
      const { ctx, updateConfiguration } = setup({ isOrderable: false });
      ctx.request.body = { settings: { pageSize: 10, customOrder: true } };

      await expect(contentTypes.updateContentTypeConfiguration(ctx)).resolves.toBe('badRequest');

      expect(ctx.badRequest).toHaveBeenCalledWith(null, {
        name: 'validationError',
        errors: ['settings.customOrder is only available on collection types'],
      });
      expect(updateConfiguration).not.toHaveBeenCalled();
    });

    test('Saves the custom order setting and applies it', async () => {
      const { ctx, updateConfiguration, customOrder } = setup();
      ctx.request.body = { settings: { pageSize: 10, customOrder: true } };

      await contentTypes.updateContentTypeConfiguration(ctx);

      expect(updateConfiguration).toHaveBeenCalledWith(expect.objectContaining({ uid }), {
        settings: { pageSize: 10, customOrder: true },
      });
      expect(customOrder.applySettings).toHaveBeenCalledWith(uid, {
        pageSize: 10,
        customOrder: true,
      });
      expect(ctx.body.data.contentType.settings).toEqual({ pageSize: 10, customOrder: true });
    });

    test('Applies the saved settings even when custom order is not part of the update', async () => {
      const { ctx, customOrder } = setup();
      ctx.request.body = { settings: { pageSize: 20 } };

      await contentTypes.updateContentTypeConfiguration(ctx);

      expect(customOrder.applySettings).toHaveBeenCalledWith(uid, { pageSize: 20 });
    });
  });
});
