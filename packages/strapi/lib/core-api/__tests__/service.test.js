'use strict';

const _ = require('lodash');
const createService = require('../service');

// init global strapi
global.strapi = {
  config: {
    get(path, defaultValue) {
      return _.get(this, path, defaultValue);
    },
    api: {
      rest: {
        defaultLimit: 20,
        maxLimit: 50,
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
        count: expect.any(Function),
        search: expect.any(Function),
        countSearch: expect.any(Function),
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
        };

        const model = {
          modelName: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        const input = {};
        await service.createOrUpdate(input);

        expect(strapi.entityService.find).toHaveBeenCalledWith(
          { populate: undefined, params: { _publicationState: 'live', _limit: 20 } },
          {
            model: 'testModel',
          }
        );

        expect(strapi.entityService.create).toHaveBeenCalledWith(
          { data: input },
          {
            model: 'testModel',
          }
        );
      });

      test('Updates data when entity is found', async () => {
        const strapi = {
          entityService: {
            find: jest.fn(() => Promise.resolve({ id: 1 })),
            update: jest.fn(() => Promise.resolve({ id: 1 })),
          },
        };

        const model = {
          modelName: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        const input = {};
        await service.createOrUpdate(input);

        expect(strapi.entityService.find).toHaveBeenCalledWith(
          { populate: undefined, params: { _publicationState: 'live', _limit: 20 } },
          {
            model: 'testModel',
          }
        );

        expect(strapi.entityService.update).toHaveBeenCalledWith(
          {
            params: { id: 1 },
            data: input,
          },
          {
            model: 'testModel',
          }
        );
      });

      test('Delete data when entity is found', async () => {
        const strapi = {
          entityService: {
            find: jest.fn(() => Promise.resolve({ id: 1 })),
            delete: jest.fn(() => Promise.resolve({ id: 1 })),
          },
        };

        const model = {
          modelName: 'testModel',
          kind: 'singleType',
        };

        const service = createService({ strapi, model });

        await service.delete();

        expect(strapi.entityService.find).toHaveBeenCalledWith(
          { populate: undefined, params: { _publicationState: 'live', _limit: 20 } },
          {
            model: 'testModel',
          }
        );

        expect(strapi.entityService.delete).toHaveBeenCalledWith(
          {
            params: { id: 1 },
          },
          {
            model: 'testModel',
          }
        );
      });
    });
  });
});

describe('getFetchParams', () => {
  test.each([
    ['1', 1],
    ['0', 0],
    ['500', 50], // returns max limit if exceeds max allowed limit
    ['', 20], // returns default if not specified
    ['-1', 50], // -1 should return all items but max limit is set, so return max allowed limit
  ])('Sets _limit parameter "%s" correctly', (input, expected) => {
    expect(createService.getFetchParams({ _limit: input })).toMatchObject({
      _limit: expected,
    });
  });
});
