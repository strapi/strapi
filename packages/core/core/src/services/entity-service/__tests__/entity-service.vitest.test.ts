import { describe, test, expect, vi, afterEach } from 'vitest';
import type { Utils } from '@strapi/types';
import { errors as databaseErrors } from '@strapi/database';
import { errors } from '@strapi/utils';
import createEntityService from '../index';

vi.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

describe('Entity service', () => {
  global.strapi = {
    getModel: vi.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
    query: vi.fn(() => ({})),
    webhookStore: {
      allowedEvents: new Map([['ENTRY_CREATE', 'entry.create']]),
      addAllowedEvent: vi.fn(),
    },
  } as any;

  describe('Decorator', () => {
    test.each(['create', 'update', 'findMany', 'findOne', 'delete', 'count'] as const)(
      'Can decorate',
      async (method) => {
        const instance = createEntityService({
          strapi: global.strapi,
          db: {} as any,
        });

        const methodFn = vi.fn();

        instance.decorate((old) => ({
          ...old,
          [method]: methodFn,
        }));

        const args = [{}, {}];
        await (instance[method] as Utils.Function.Any)(...args);
        expect(methodFn).toHaveBeenCalled();
      }
    );
  });

  describe('Find', () => {
    test('Returns first element for single types', async () => {
      const data = {
        id: 1,
        title: 'Test',
      };

      const fakeDocumentService = {
        findFirst: vi.fn(() => Promise.resolve(data)),
      };

      const fakeStrapi = {
        ...global.strapi,
        documents: vi.fn(() => fakeDocumentService),
        getModel: vi.fn(() => {
          return { kind: 'singleType' };
        }),
      };

      const instance = createEntityService({
        strapi: fakeStrapi as any,
        db: {} as any,
      });

      const result = await instance.findMany('api::test.test-model');

      expect(fakeStrapi.getModel).toHaveBeenCalledTimes(1);
      expect(fakeStrapi.getModel).toHaveBeenCalledWith('api::test.test-model');

      expect(fakeStrapi.documents).toHaveBeenCalledWith('api::test.test-model');
      expect(fakeDocumentService.findFirst).toHaveBeenCalledWith({});
      expect(result).toEqual(data);
    });
  });

  describe('loadPages', () => {
    const uid = 'api::test.test-model';
    const entity = { id: 1 };
    const total = 42;
    const originalStrapi = global.strapi;

    afterEach(() => {
      global.strapi = originalStrapi;
    });

    const setup = () => {
      const load = vi.fn((_entity: unknown, _field: string, query: Record<string, unknown>) =>
        Promise.resolve(query.count === true ? { count: total } : [{ id: 2 }])
      );
      const loadPages = vi.fn(() =>
        Promise.resolve({
          results: [{ id: 3 }],
          pagination: { page: 1, pageSize: 10, pageCount: 5, total },
        })
      );

      const fakeStrapi = {
        ...global.strapi,
        getModel: vi.fn(() => ({
          attributes: { tags: { type: 'relation', relation: 'manyToMany' } },
        })),
        // Identity transform: the tests check how pagination reaches the database
        get: vi.fn(() => ({ transform: (_uid: string, params: unknown) => params })),
      };

      // transformLoadParamsToQuery reads the global strapi
      global.strapi = fakeStrapi as any;

      const instance = createEntityService({
        strapi: fakeStrapi as any,
        db: { query: vi.fn(() => ({ load, loadPages })) } as any,
      });

      return { instance, load, loadPages };
    };

    const loadTagPages = (
      instance: ReturnType<typeof setup>['instance'],
      pagination: unknown,
      params: object = {}
    ) =>
      instance.loadPages(
        uid as any,
        entity as any,
        'tags' as any,
        params as any,
        pagination as any
      );

    test('loads the requested slice for offset notation', async () => {
      const { instance, load, loadPages } = setup();

      const result = await loadTagPages(instance, { start: 20, limit: 5 });

      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 20, limit: 5 });
      expect(load).toHaveBeenCalledWith(entity, 'tags', { count: true });
      expect(loadPages).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [{ id: 2 }],
        pagination: { start: 20, limit: 5, total },
      });
    });

    test('defaults offset notation to start 0 and limit 10', async () => {
      const { instance, load } = setup();

      const startOnly = await loadTagPages(instance, { start: 12 });
      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 12, limit: 10 });
      expect(startOnly.pagination).toEqual({ start: 12, limit: 10, total });

      const limitOnly = await loadTagPages(instance, { limit: 3 });
      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 0, limit: 3 });
      expect(limitOnly.pagination).toEqual({ start: 0, limit: 3, total });
    });

    test('a limit of -1 loads every entry from start', async () => {
      const { instance, load } = setup();

      const result = await loadTagPages(instance, { start: 18, limit: -1 });

      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 18 });
      expect(result.pagination).toEqual({ start: 18, limit: -1, total });
    });

    test.each([
      ['page notation', { page: 2, pageSize: 5 }],
      ['no pagination', {}],
      ['mixed notations', { page: 2, limit: 5 }],
    ])('passes %s to the repository loadPages', async (_name, pagination) => {
      const { instance, load, loadPages } = setup();

      const result = await loadTagPages(instance, pagination);

      expect(loadPages).toHaveBeenCalledWith(entity, 'tags', pagination);
      expect(load).not.toHaveBeenCalled();
      expect(result.pagination).toEqual({ page: 1, pageSize: 10, pageCount: 5, total });
    });

    test('takes the offset path when the page notation keys are undefined', async () => {
      const { instance, load, loadPages } = setup();

      const result = await loadTagPages(instance, { page: undefined, start: 20, limit: 5 });

      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 20, limit: 5 });
      expect(loadPages).not.toHaveBeenCalled();
      expect(result.pagination).toEqual({ start: 20, limit: 5, total });
    });

    test.each([
      ['a null pagination', null],
      ['offset notation keys set to undefined', { start: undefined }],
    ])('passes %s to the repository loadPages', async (_name, pagination) => {
      const { instance, load, loadPages } = setup();

      const result = await loadTagPages(instance, pagination);

      expect(loadPages).toHaveBeenCalledTimes(1);
      expect(load).not.toHaveBeenCalled();
      expect(result.pagination).toEqual({ page: 1, pageSize: 10, pageCount: 5, total });
    });

    test('a limit of -1 replaces a limit from params', async () => {
      const { instance, load } = setup();

      const result = await loadTagPages(instance, { start: 18, limit: -1 }, { limit: 2 });

      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 18 });
      expect(result.pagination).toEqual({ start: 18, limit: -1, total });
    });

    test('pagination limit replaces a limit from params', async () => {
      const { instance, load } = setup();

      await loadTagPages(instance, { start: 4, limit: 5 }, { limit: 2 });

      expect(load).toHaveBeenCalledWith(entity, 'tags', { offset: 4, limit: 5 });
    });
  });

  describe('Database errors', () => {
    test.each([
      ['InvalidBooleanError', databaseErrors.InvalidBooleanError],
      ['InvalidDateError', databaseErrors.InvalidDateError],
    ])('transforms %s into a ValidationError', async (_name, DatabaseErrorClass) => {
      const fakeStrapi = {
        ...global.strapi,
        documents: vi.fn(() => ({
          findFirst: vi.fn(() => Promise.reject(new DatabaseErrorClass())),
        })),
        getModel: vi.fn(() => ({ kind: 'singleType' })),
      };

      const instance = createEntityService({
        strapi: fakeStrapi as any,
        db: {} as any,
      });

      await expect(instance.findMany('api::test.test-model')).rejects.toBeInstanceOf(
        errors.ValidationError
      );
    });
  });
});
