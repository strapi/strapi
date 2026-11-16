import { describe, test, expect, vi } from 'vitest';
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
