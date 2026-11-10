import createConfigurationService from '../configuration';
import createContentTypesService from '../content-types';
import storeUtils from '../utils/store';
import createDataMapperService from '../data-mapper';
import createFieldSizesService from '../field-sizes';

const createCfg = (opts = {}) => {
  return createConfigurationService({
    prefix: 'test_prefix',
    storeUtils,
    get models() {
      return {};
    },
    ...opts,
  } as any);
};

describe('Model Configuration', () => {
  test('getConfiguration calls store with right key', async () => {
    const uid = 'test-uid';
    const spyFn = jest
      .spyOn(storeUtils, 'getModelConfiguration')
      .mockImplementation((() => {}) as any);

    const { getConfiguration } = createCfg();
    await getConfiguration(uid);

    expect(spyFn).toHaveBeenCalledWith('test_prefix::test-uid');
    spyFn.mockRestore();
  });

  test('setConfiguration calls store with right params', async () => {
    const uid = 'test-uid';
    const spyFn = jest
      .spyOn(storeUtils, 'setModelConfiguration')
      .mockImplementation((() => {}) as any);

    const { setConfiguration } = createCfg();
    await setConfiguration(uid, {
      settings: {},
      layouts: {},
      metadatas: {},
    } as any);

    expect(spyFn).toHaveBeenCalledWith('test_prefix::test-uid', {
      layouts: {},
      metadatas: {},
      settings: {},
      uid: 'test-uid',
    });

    spyFn.mockRestore();
  });

  test('setConfiguration should store optional options object', async () => {
    const uid = 'test-uid';
    const spyFn = jest
      .spyOn(storeUtils, 'setModelConfiguration')
      .mockImplementation((() => {}) as any);

    const { setConfiguration } = createCfg();
    await setConfiguration(uid, {
      layouts: {},
      metadatas: {},
      settings: {},
      options: { test: true },
    } as any);

    expect(spyFn).toHaveBeenCalledWith('test_prefix::test-uid', {
      layouts: {},
      metadatas: {},
      settings: {},
      options: { test: true },
      uid: 'test-uid',
    });

    spyFn.mockRestore();
  });

  test('setConfiguration calls store with isComponent if set in factory option', async () => {
    const uid = 'test-uid';
    const spyFn = jest
      .spyOn(storeUtils, 'setModelConfiguration')
      .mockImplementation((() => {}) as any);

    const { setConfiguration } = createCfg({ isComponent: true });
    await setConfiguration(uid, {
      settings: {},
      layouts: {},
      metadatas: {},
    } as any);

    expect(spyFn).toHaveBeenCalledWith('test_prefix::test-uid', {
      layouts: {},
      metadatas: {},
      isComponent: true,
      settings: {},
      uid: 'test-uid',
    });

    spyFn.mockRestore();
  });

  test('deleteConfiguration calls store with right params', async () => {
    const uid = 'test-uid';
    const spyFn = jest.spyOn(storeUtils, 'deleteKey').mockImplementation((() => {}) as any);

    const { deleteConfiguration } = createCfg();
    await deleteConfiguration(uid);

    expect(spyFn).toHaveBeenCalledWith('test_prefix::test-uid');

    spyFn.mockRestore();
  });

  test.todo('Sync Configuration');
});

describe('findContentTypesByKind', () => {
  const contentTypes = {
    'api::article.article': { uid: 'api::article.article', kind: 'collectionType' },
    'api::homepage.homepage': { uid: 'api::homepage.homepage', kind: 'singleType' },
  };

  const strapi = {
    contentTypes,
    plugins: {
      'content-manager': {
        services: {
          'data-mapper': { toContentManagerModel: (contentType: unknown) => contentType },
        },
      },
    },
  } as any;

  beforeEach(() => {
    global.strapi = strapi;
  });

  test('returns the content types of the given kind', () => {
    const service = createContentTypesService({ strapi });

    expect(service.findContentTypesByKind('collectionType')).toStrictEqual([
      contentTypes['api::article.article'],
    ]);
    expect(service.findContentTypesByKind('singleType')).toStrictEqual([
      contentTypes['api::homepage.homepage'],
    ]);
  });

  test('returns all content types when no kind is given', () => {
    const service = createContentTypesService({ strapi });

    expect(service.findContentTypesByKind(undefined)).toStrictEqual(Object.values(contentTypes));
    expect(service.findContentTypesByKind(null)).toStrictEqual(Object.values(contentTypes));
  });
});

describe('findConfiguration', () => {
  const contentType = {
    uid: 'api::article.article',
    modelType: 'contentType',
    modelName: 'article',
    kind: 'collectionType',
    globalId: 'Article',
    info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string' },
    },
  };

  // The core store, as rows of the `strapi::core-store` table with JSON values
  const rows = new Map<string, string>();
  const STORE_PREFIX = 'plugin_content_manager_';

  const services: Record<string, unknown> = {};

  const strapi = {
    contentTypes: { [contentType.uid]: contentType },
    components: {},
    getModel: (uid: string) => (uid === contentType.uid ? contentType : undefined),
    plugins: { 'content-manager': { services } },
    store: () => ({
      async get({ key }: { key: string }) {
        const value = rows.get(`${STORE_PREFIX}${key}`);
        return value === undefined ? null : JSON.parse(value);
      },
      async set({ key, value }: { key: string; value: unknown }) {
        rows.set(`${STORE_PREFIX}${key}`, JSON.stringify(value));
      },
    }),
    db: {
      query: () => ({
        async findMany({ where }: { where: { key: { $startsWith: string } } }) {
          return [...rows.entries()]
            .filter(([key]) => key.startsWith(where.key.$startsWith))
            .map(([key, value]) => ({ key, value }));
        },
        async delete({ where }: { where: { key: string } }) {
          rows.delete(where.key);
        },
      }),
    },
    log: { warn: jest.fn() },
  } as any;

  beforeEach(() => {
    rows.clear();
    global.strapi = strapi;
    services['data-mapper'] = createDataMapperService();
    services['field-sizes'] = createFieldSizesService({ strapi });
    services['content-types'] = createContentTypesService({ strapi });
  });

  test('returns the synced configuration with the content type uid', async () => {
    const service = createContentTypesService({ strapi });

    await service.syncConfigurations();
    const configuration = await service.findConfiguration(contentType as any);

    // The store keeps JSON: the content type's `isComponent: undefined` is not stored
    expect(Object.keys(configuration).sort()).toEqual(['layouts', 'metadatas', 'settings', 'uid']);
    expect(configuration.uid).toBe('api::article.article');
    expect(configuration.settings).toMatchObject({
      mainField: 'title',
      defaultSortBy: 'title',
      defaultSortOrder: 'ASC',
      pageSize: expect.any(Number),
    });
    expect(Object.keys(configuration.metadatas).sort()).toEqual(['documentId', 'id', 'title']);
    expect(configuration.metadatas.title).toEqual({
      edit: expect.objectContaining({ label: 'title', visible: true, editable: true }),
      list: expect.objectContaining({ label: 'title', searchable: true, sortable: true }),
    });
    expect(configuration.layouts).toEqual({
      list: ['id', 'title'],
      edit: [[{ name: 'title', size: expect.any(Number) }]],
    });
  });

  test('returns the empty configuration with the content type uid before any sync', async () => {
    const service = createContentTypesService({ strapi });

    const configuration = await service.findConfiguration(contentType as any);

    expect(configuration).toEqual({
      uid: 'api::article.article',
      settings: {},
      metadatas: {},
      layouts: { list: [], edit: [] },
    });
  });
});
