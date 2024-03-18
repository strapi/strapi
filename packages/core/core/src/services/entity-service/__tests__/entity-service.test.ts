import type { Utils } from '@strapi/types';
import createEntityService from '../index';

jest.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

describe('Entity service', () => {
  global.strapi = {
    getModel: jest.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
    query: jest.fn(() => ({})),
    webhookStore: {
      allowedEvents: new Map([['ENTRY_CREATE', 'entry.create']]),
      addAllowedEvent: jest.fn(),
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

        const methodFn = jest.fn();

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
        findFirst: jest.fn(() => Promise.resolve(data)),
      };

      const fakeStrapi = {
        ...global.strapi,
        documents: jest.fn(() => fakeDocumentService),
        getModel: jest.fn(() => {
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
});
