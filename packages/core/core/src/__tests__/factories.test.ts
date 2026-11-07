import vm from 'node:vm';

import { createCoreController, createCoreService } from '../factories';

const makeStrapi = (kind: 'collectionType' | 'singleType') =>
  ({
    contentType: () => ({ uid: 'api::test.test', modelName: 'test', kind }),
  }) as any;

describe('createCoreController', () => {
  test('gives an object literal the default actions', () => {
    const controller = createCoreController('api::test.test' as any, {
      async custom() {
        return 'custom';
      },
    })({ strapi: makeStrapi('collectionType') });

    expect(Object.keys(controller).sort()).toEqual(
      ['create', 'custom', 'delete', 'find', 'findOne', 'update'].sort()
    );
    expect(controller.sanitizeQuery).toEqual(expect.any(Function));
  });

  test('treats an object literal from another realm as an object literal', () => {
    const controller = createCoreController(
      'api::test.test' as any,
      () => vm.runInNewContext('({ async custom() {} })') as any
    )({ strapi: makeStrapi('collectionType') });

    expect(Object.keys(controller).sort()).toEqual(
      ['create', 'custom', 'delete', 'find', 'findOne', 'update'].sort()
    );
  });

  test('keeps a class instance, its methods and its overrides', async () => {
    class TestController {
      async find() {
        return 'overridden';
      }

      async custom(ctx: any) {
        return this.sanitizeQuery(ctx);
      }

      // Provided by the base controller
      declare sanitizeQuery: (ctx: any) => Promise<unknown>;
    }

    const instance = new TestController();

    const controller = createCoreController(
      'api::test.test' as any,
      () => instance as any
    )({
      strapi: makeStrapi('collectionType'),
    });

    expect(controller).toBe(instance);
    expect(controller).toBeInstanceOf(TestController);
    expect(await controller.find({} as any, jest.fn())).toBe('overridden');

    // users-permissions builds its permission actions from the controller's own keys
    expect(Object.keys(controller).sort()).toEqual(
      ['create', 'custom', 'delete', 'find', 'findOne', 'update'].sort()
    );
    expect(controller.sanitizeQuery).toEqual(expect.any(Function));
  });
});

describe('createCoreService', () => {
  test('gives an object literal the core service as its prototype', () => {
    const service = createCoreService('api::test.test' as any, {
      async custom() {
        return 'custom';
      },
    })({ strapi: makeStrapi('collectionType') });

    expect(service.find).toEqual(expect.any(Function));
    expect(service.custom).toEqual(expect.any(Function));
  });

  test('keeps a class instance, its methods and its overrides', async () => {
    class TestService {
      async update() {
        return 'overridden';
      }

      async custom() {
        return 'custom';
      }
    }

    const instance = new TestService();

    const service = createCoreService(
      'api::test.test' as any,
      () => instance as any
    )({
      strapi: makeStrapi('collectionType'),
    });

    expect(service).toBe(instance);
    expect(service).toBeInstanceOf(TestService);
    expect(await service.update('id', {} as any)).toBe('overridden');
    expect(await (service as any).custom()).toBe('custom');
    expect(service.find).toEqual(expect.any(Function));
    expect(service.getFetchParams({})).toEqual({ status: 'published' });
  });
});
