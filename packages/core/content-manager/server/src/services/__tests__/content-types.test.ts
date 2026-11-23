import createConfigurationService from '../configuration';
import createContentTypesService from '../content-types';
import storeUtils from '../utils/store';

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
