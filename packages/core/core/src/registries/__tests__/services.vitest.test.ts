import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import createServicesRegistry from '../services';
import type { ServiceFactory } from '../services';

// `loadAdmin` registers the raw `strapi.admin.services` map under the `admin::` namespace. These
// tests pin why admin services must be read through `strapi.service('admin::<name>')`.
describe('Services registry - admin namespace', () => {
  const strapi = {} as Core.Strapi;

  test('returns the object registered in the admin services map', () => {
    const permission = { findMany: () => [] };
    const adminServices = { permission };
    const registry = createServicesRegistry(strapi);

    registry.add('admin::', adminServices);

    expect(registry.get('admin::permission')).toBe(adminServices.permission);
  });

  test('returns the extended service, while the admin services map keeps the original one', () => {
    const permission = { findMany: () => 'original' };
    const adminServices = { permission };
    const registry = createServicesRegistry(strapi);

    registry.add('admin::', adminServices);
    registry.extend('admin::permission', (service) => ({
      ...service,
      findMany: () => 'extended',
    }));

    expect(registry.get('admin::permission').findMany()).toBe('extended');
    expect(adminServices.permission.findMany()).toBe('original');
  });

  test('instantiates a factory, while the admin services map keeps the factory', () => {
    const instance = { getHomepage: () => [] };
    const homepage = () => instance;
    const adminServices = { homepage };
    const registry = createServicesRegistry(strapi);

    registry.add('admin::', adminServices);

    expect(registry.get('admin::homepage')).toBe(instance);
    expect(adminServices.homepage).toBe(homepage);
  });
});

describe('Services registry', () => {
  const strapi = {} as Core.Strapi;

  test('Calls a factory once with strapi and returns its service', () => {
    const registry = createServicesRegistry(strapi);
    const factory = vi.fn(() => ({ count: () => 1 }));

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
