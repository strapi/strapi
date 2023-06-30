'use strict';

const { createService } = require('../index');

describe('Default Service', () => {
  describe('Collection Type', () => {
    test('Creates default actions', () => {
      const contentType = {
        modelName: 'testModel',
        kind: 'collectionType',
      };

      const service = createService({ contentType });

      expect(service).toEqual({
        find: expect.any(Function),
        findOne: expect.any(Function),
        create: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      });
    });
  });

  describe('Single Type', () => {
    test('Creates default actions', () => {
      const contentType = {
        modelName: 'testModel',
        kind: 'singleType',
      };

      const service = createService({ contentType });

      expect(service).toEqual({
        find: expect.any(Function),
        createOrUpdate: expect.any(Function),
        delete: expect.any(Function),
      });
    });

    describe('Passes the logic down to the entityService', () => {
      test('Creates data when no entity is found', async () => {
        global.strapi = {
          entityService: {
            findMany: jest.fn(() => Promise.resolve(null)),
            create: jest.fn(() => Promise.resolve({ id: 1 })),
          },
          query() {
            return { count() {} };
          },
        };

        const contentType = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ contentType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(strapi.entityService.findMany).toHaveBeenCalledWith('testModel', {
          publicationState: 'preview',
        });

        expect(strapi.entityService.create).toHaveBeenCalledWith('testModel', { data: input });
      });

      test('Updates data when entity is found', async () => {
        global.strapi = {
          entityService: {
            findMany: jest.fn(() => Promise.resolve({ id: 1 })),
            update: jest.fn(() => Promise.resolve({ id: 1 })),
          },
          query() {
            return { count() {} };
          },
        };

        const contentType = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ contentType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(strapi.entityService.findMany).toHaveBeenCalledWith('testModel', {
          populate: undefined,
          publicationState: 'preview',
        });

        expect(strapi.entityService.update).toHaveBeenCalledWith('testModel', 1, {
          data: input,
        });
      });

      test('Delete data when entity is found', async () => {
        global.strapi = {
          entityService: {
            findMany: jest.fn(() => Promise.resolve({ id: 1 })),
            delete: jest.fn(() => Promise.resolve({ id: 1 })),
          },
        };

        const contentType = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ contentType });

        await service.delete();

        expect(strapi.entityService.findMany).toHaveBeenCalledWith('testModel', {
          populate: undefined,
          publicationState: 'live',
        });

        expect(strapi.entityService.delete).toHaveBeenCalledWith('testModel', 1);
      });
    });
  });
});
