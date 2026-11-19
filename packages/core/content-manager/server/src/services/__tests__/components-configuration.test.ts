import type { Struct } from '@strapi/types';

import componentsService from '../components';

const store = new Map<string, Record<string, unknown>>();

jest.mock('../utils/store', () => ({
  __esModule: true,
  default: {
    findByKey: jest.fn(async () => []),
    setModelConfiguration: jest.fn(async (key: string, value: Record<string, unknown>) => {
      store.set(key, value);
    }),
    getModelConfiguration: jest.fn(async (key: string) => store.get(key)),
    deleteKey: jest.fn(),
  },
}));

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    toContentManagerModel: (model: unknown) => model,
  })),
}));

jest.mock('../utils/configuration', () => ({
  createDefaultConfiguration: jest.fn(async () => ({
    settings: { mainField: 'id' },
    metadatas: {},
    layouts: { list: [], edit: [] },
  })),
  syncConfiguration: jest.fn(),
}));

const component = {
  uid: 'default.address',
  modelType: 'component',
  modelName: 'address',
  category: 'default',
  globalId: 'ComponentDefaultAddress',
  info: { displayName: 'Address' },
  options: {},
  attributes: {},
} as unknown as Struct.ComponentSchema;

describe('components service configuration', () => {
  beforeEach(() => {
    store.clear();
    (global as any).strapi = { components: { [component.uid]: component } };
  });

  test('a synced component configuration is stored and found with isComponent: true', async () => {
    const service = componentsService({ strapi: (global as any).strapi });

    await service.syncConfigurations();

    const stored = store.get('components::default.address');

    // The stored value carries the component UID and isComponent, never a category.
    expect(stored).toMatchObject({ uid: 'default.address', isComponent: true });
    expect(stored).not.toHaveProperty('category');

    const result = await service.findConfiguration(component);

    expect(result).toMatchObject({
      uid: 'default.address',
      category: 'default',
      isComponent: true,
    });
  });
});
