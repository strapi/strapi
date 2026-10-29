import type { Core } from '@strapi/types';
import createServicesRegistry from '../services';
import type { ServiceFactory } from '../services';

describe('Services registry', () => {
  const strapi = {} as Core.Strapi;

  test('Calls a factory once with strapi and returns its service', () => {
    const registry = createServicesRegistry(strapi);
    const factory = jest.fn(() => ({ count: () => 1 }));

    registry.set('api::test.factory', factory satisfies ServiceFactory);

    const service = registry.get('api::test.factory');
    expect(registry.get('api::test.factory')).toBe(service);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith({ strapi });
    expect(service?.count()).toBe(1);
  });

  test('Returns a service registered as an object', () => {
    const registry = createServicesRegistry(strapi);
    const service = { count: () => 1 };

    registry.set('api::test.object', service satisfies ServiceFactory);

    expect(registry.get('api::test.object')).toBe(service);
  });
});
