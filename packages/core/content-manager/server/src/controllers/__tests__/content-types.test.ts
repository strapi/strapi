// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import contentTypes from '../content-types';

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

  describe('content type configuration round trip', () => {
    const uid = 'api::article.article';
    const contentType = {
      uid,
      attributes: {
        title: { type: 'string' },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          targetModel: 'admin::user',
        },
      },
    };
    const userSchema = { uid: 'admin::user', attributes: { firstname: { type: 'string' } } };
    const storedConfiguration = {
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'title',
        defaultSortBy: 'title',
        defaultSortOrder: 'ASC',
      },
      metadatas: {
        title: {
          edit: { label: 'title', description: '', placeholder: '', visible: true, editable: true },
          list: { label: 'title', searchable: true, sortable: true },
        },
        createdBy: {
          edit: {
            label: 'createdBy',
            description: '',
            placeholder: '',
            visible: false,
            editable: true,
            mainField: 'firstname',
          },
          list: { label: 'createdBy', searchable: true, sortable: true },
        },
      },
      layouts: {
        edit: [[{ name: 'title', size: 6 }]],
        list: ['title'],
      },
    };

    const updateConfiguration = jest.fn(async (_model: any, input: any) => input);

    beforeEach(() => {
      updateConfiguration.mockClear();
      global.strapi = {
        getModel: (target: string) => (target === uid ? contentType : userSchema),
        plugins: {
          'content-manager': {
            services: {
              'content-types': {
                findContentType: (target: string) => (target === uid ? contentType : userSchema),
                findConfiguration: async () => ({ uid, ...storedConfiguration }),
                findComponentsConfigurations: async () => ({}),
                updateConfiguration,
              },
              metrics: { sendDidConfigureListView: jest.fn() },
              permission: { canConfigureContentType: () => true },
            },
          },
        },
      } as any;
    });

    test('accepts the configuration it returns, without storing the derived list.mainField', async () => {
      const readCtx = createContext({ params: { uid } });
      await contentTypes.findContentTypeConfiguration(readCtx);
      const { uid: _uid, ...configuration } = (readCtx as any).body.data.contentType;

      // What the read hands out: a list.mainField copied from edit.mainField.
      expect(configuration.metadatas.createdBy.list.mainField).toBe('firstname');

      const badRequest = jest.fn();
      const updateCtx = createContext(
        { params: { uid }, body: configuration },
        { state: { userAbility: {} }, badRequest, forbidden: jest.fn(), notFound: jest.fn() }
      );
      await contentTypes.updateContentTypeConfiguration(updateCtx);

      expect(badRequest).not.toHaveBeenCalled();
      expect(updateConfiguration).toHaveBeenCalledTimes(1);
      const input = updateConfiguration.mock.calls[0][1];
      expect(input.metadatas.createdBy.list).toStrictEqual({
        label: 'createdBy',
        searchable: true,
        sortable: true,
      });
      expect(input.metadatas.createdBy.edit.mainField).toBe('firstname');
    });

    test('still rejects unknown metadata keys', async () => {
      const badRequest = jest.fn();
      const body = {
        ...storedConfiguration,
        metadatas: {
          ...storedConfiguration.metadatas,
          title: {
            ...storedConfiguration.metadatas.title,
            list: { ...storedConfiguration.metadatas.title.list, unknownKey: true },
          },
        },
      };
      const ctx = createContext(
        { params: { uid }, body },
        { state: { userAbility: {} }, badRequest, forbidden: jest.fn(), notFound: jest.fn() }
      );
      await contentTypes.updateContentTypeConfiguration(ctx);

      expect(badRequest).toHaveBeenCalledTimes(1);
      expect(updateConfiguration).not.toHaveBeenCalled();
    });
  });
});
