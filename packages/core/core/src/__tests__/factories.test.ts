import vm from 'node:vm';

import { createCoreController, createCoreService } from '../factories';
import { CollectionTypeController } from '../core-api/controller/collection-type';
import { CollectionTypeService } from '../core-api/service/collection-type';

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

describe('core-api class subclasses', () => {
  test('keeps a CollectionTypeController subclass and exposes only actions as own keys', async () => {
    class TestController extends CollectionTypeController {
      async find() {
        return 'overridden';
      }

      async custom() {
        return 'custom';
      }
    }

    const strapi = makeStrapi('collectionType');
    const instance = new TestController({ strapi, contentType: strapi.contentType() });

    const controller = createCoreController(
      'api::test.test' as any,
      () => instance as any
    )({
      strapi,
    });

    expect(controller).toBe(instance);
    expect(await controller.find({} as any, jest.fn())).toBe('overridden');
    // No separate base controller: the helpers come from the class itself
    expect(controller.sanitizeQuery).toBe(CollectionTypeController.prototype.sanitizeQuery);
    expect(Object.keys(controller).sort()).toEqual(
      ['create', 'custom', 'delete', 'find', 'findOne', 'update'].sort()
    );
  });

  test('keeps a CollectionTypeService subclass and lets it call super', async () => {
    class TestService extends CollectionTypeService {
      getFetchParams(params = {}) {
        return { ...super.getFetchParams(params), locale: 'fr' };
      }
    }

    const strapi = makeStrapi('collectionType');
    const instance = new TestService({ strapi, contentType: strapi.contentType() });

    const service = createCoreService('api::test.test' as any, () => instance as any)({ strapi });

    expect(service).toBe(instance);
    // Left as is: no base service built, no method added
    expect(Object.getOwnPropertyNames(service).sort()).toEqual(['contentType', 'strapi']);
    expect(service.find).toBe(CollectionTypeService.prototype.find);
    expect(service.getFetchParams({})).toEqual({ status: 'published', locale: 'fr' });
  });
});

describe('core controller actions', () => {
  // The router marks route types (content-api, admin) on the action function itself
  test('are not shared between controllers', () => {
    const strapi = makeStrapi('collectionType');

    const first = createCoreController('api::first.first' as any)({ strapi });
    const second = createCoreController('api::second.second' as any, () => {
      return new CollectionTypeController({ strapi, contentType: strapi.contentType() }) as any;
    })({ strapi });

    expect(first.find).not.toBe(second.find);
    expect(first.find).not.toBe(CollectionTypeController.prototype.find);
    expect(second.find).not.toBe(CollectionTypeController.prototype.find);
  });

  test('call the helpers an object literal overrides', async () => {
    const sanitizeOutput = jest.fn(async () => [{ id: 'sanitized by the literal' }]);
    const strapi = {
      ...makeStrapi('collectionType'),
      config: { get: jest.fn() },
      service: () => ({ find: async () => ({ results: [], pagination: {} }) }),
      contentAPI: {
        validate: { query: jest.fn() },
        sanitize: { query: jest.fn(async () => ({})) },
      },
    } as any;

    const controller = createCoreController('api::test.test' as any, { sanitizeOutput })({
      strapi,
    });

    const response: any = await controller.find({ query: {}, state: {} } as any, jest.fn());

    expect(sanitizeOutput).toHaveBeenCalled();
    expect(response.data).toEqual([{ id: 'sanitized by the literal' }]);
  });
});
