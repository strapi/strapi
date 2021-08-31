'use strict';

const _ = require('lodash');
const { createService } = require('../service');

const maxLimit = 50;
const defaultLimit = 20;

// init global strapi
global.strapi = {
  config: {
    get(path, defaultValue) {
      return _.get(this, path, defaultValue);
    },
    api: {
      rest: {
        defaultLimit,
        maxLimit,
      },
    },
  },
};

describe('Default Service', () => {
  describe('Collection Type', () => {
    test('Creates default actions', () => {
      const strapi = {};
      const model = {
        modelName: 'testModel',
        kind: 'collectionType',
      };

      const service = createService({ strapi, model });

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
      const strapi = {};
      const model = {
        modelName: 'testModel',
        kind: 'singleType',
      };

      const service = createService({ strapi, model });

      expect(service).toEqual({
        find: expect.any(Function),
        createOrUpdate: expect.any(Function),
        delete: expect.any(Function),
      });
    });

    describe('Passes the logic down to the entityService', () => {
      test('Creates data when no entity is found', async () => {
        const strapi = {
          entityService: {
            find: jest.fn(() => Promise.resolve(null)),
            create: jest.fn(() => Promise.resolve({ id: 1 })),
          },
          query() {
            return { count() {} };
          },
        };

        const model = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        const input = {};
        await service.createOrUpdate(input);

        expect(strapi.entityService.find).toHaveBeenCalledWith('testModel', {
          params: { publicationState: 'live' },
        });

        expect(strapi.entityService.create).toHaveBeenCalledWith('testModel', { data: input });
      });

      test('Updates data when entity is found', async () => {
        const strapi = {
          entityService: {
            find: jest.fn(() => Promise.resolve({ id: 1 })),
            update: jest.fn(() => Promise.resolve({ id: 1 })),
          },
          query() {
            return { count() {} };
          },
        };

        const model = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        const input = {};
        await service.createOrUpdate(input);

        expect(strapi.entityService.find).toHaveBeenCalledWith('testModel', {
          populate: undefined,
          params: { publicationState: 'live' },
        });

        expect(strapi.entityService.update).toHaveBeenCalledWith('testModel', 1, {
          data: input,
        });
      });

      test('Delete data when entity is found', async () => {
        const strapi = {
          entityService: {
            find: jest.fn(() => Promise.resolve({ id: 1 })),
            delete: jest.fn(() => Promise.resolve({ id: 1 })),
          },
        };

        const model = {
          uid: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        await service.delete();

        expect(strapi.entityService.find).toHaveBeenCalledWith('testModel', {
          populate: undefined,
          params: { publicationState: 'live' },
        });

        expect(strapi.entityService.delete).toHaveBeenCalledWith('testModel', 1);
      });
    });
  });
});
