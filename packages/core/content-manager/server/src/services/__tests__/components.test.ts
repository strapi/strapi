import componentsService from '../components';
import storeUtils from '../utils/store';

jest.mock('../utils/store', () => ({
  __esModule: true,
  default: {
    getModelConfigurations: jest.fn(),
  },
}));

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    toContentManagerModel: (model: any) => model,
  })),
}));

// Mock global strapi for module-level references
beforeEach(() => {
  (global as any).strapi = {
    components: {},
    requestContext: {
      get: () => undefined,
    },
  };
});

const configuration = {
  test: 'value',
  some: 'config',
};

jest.mock('../configuration', () =>
  jest.fn(() => ({
    getConfiguration: jest.fn(() => configuration),
  }))
);

describe('componentService', () => {
  test('findComponent', async () => {
    const { findConfiguration } = componentsService({} as any);

    const component = {
      uid: 'blog.test-compo',
      category: 'blog',
    } as any;

    const result = await findConfiguration(component);

    expect(result).toEqual({ ...component, ...configuration });
  });

  test('findComponentsConfigurations caches results per request', async () => {
    const requestState: Record<string, any> = {};
    const strapiMock = {
      components: {
        'shared.block': {
          uid: 'shared.block',
          category: 'shared',
          attributes: {},
        },
      },
      requestContext: {
        get: () => ({ state: requestState }),
      },
    };

    // Update global mock to use the same requestContext
    (global as any).strapi = strapiMock;

    (storeUtils.getModelConfigurations as jest.Mock).mockResolvedValue({
      'components::shared.block': {
        settings: {},
        metadatas: {},
        layouts: { list: [], edit: [] },
      },
    });

    const service = componentsService({ strapi: strapiMock } as any);

    const model = {
      attributes: {
        block: { type: 'component', component: 'shared.block' },
      },
    } as any;

    await service.findComponentsConfigurations(model);
    await service.findComponentsConfigurations(model);

    expect(storeUtils.getModelConfigurations).toHaveBeenCalledTimes(1);
  });
});
