import { createController, getActionNames } from '../controller';
import { CollectionTypeController } from '../controller/collection-type';
import { SingleTypeController } from '../controller/single-type';

describe('Default Controller', () => {
  test('Creates Collection Type default actions', () => {
    const contentType = {
      uid: 'api::test.test',
      modelName: 'testModel',
      kind: 'collectionType',
    } as any;

    const controller = createController({ strapi: {} as any, contentType });

    expect(controller).toBeInstanceOf(CollectionTypeController);
    expect(getActionNames(controller).sort()).toEqual(
      ['create', 'delete', 'find', 'findOne', 'update'].sort()
    );
  });

  test('Creates Single Type default actions', () => {
    const contentType = {
      uid: 'api::test.test',
      modelName: 'testModel',
      kind: 'singleType',
    } as any;

    const controller = createController({ strapi: {} as any, contentType });

    expect(controller).toBeInstanceOf(SingleTypeController);
    expect(getActionNames(controller).sort()).toEqual(['delete', 'find', 'update'].sort());
  });
});

describe('Injected strapi', () => {
  test('uses the strapi instance it was created with, not the global one', async () => {
    const service = { find: jest.fn(async () => ({ results: [{ id: 1 }], pagination: {} })) };
    const strapi = {
      config: { get: jest.fn() },
      service: jest.fn(() => service),
      contentAPI: {
        validate: { query: jest.fn() },
        sanitize: {
          query: jest.fn(async (query) => query),
          output: jest.fn(async (data) => data),
        },
      },
    } as any;

    const contentType = {
      uid: 'api::test.test',
      modelName: 'testModel',
      kind: 'collectionType',
    } as any;

    const controller = createController({ strapi, contentType });
    const ctx = { query: {}, state: {} } as any;

    expect(global.strapi).toBeUndefined();
    expect(await controller.find(ctx, jest.fn())).toEqual({
      data: [{ id: 1 }],
      meta: { pagination: {} },
    });
    expect(strapi.service).toHaveBeenCalledWith('api::test.test');
    expect(strapi.contentAPI.validate.query).toHaveBeenCalled();
  });
});
