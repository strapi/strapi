'use strict';

const _ = require('lodash');
const createService = require('../service');

const maxLimit = 50;

// init global strapi
global.strapi = {
  config: {
    get(path, defaultValue) {
      return _.get(this, path, defaultValue);
    },
    api: {
      rest: {
        defaultLimit: 20,
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
    [{ _limit: '1' }, 1],
    [{ _limit: '0' }, 0],
    [{ _limit: 0 }, 0],
    [{ _limit: '' }, 0], // if _limit specified as ?_limit=, return 0
    [{ _limit: '500' }, 50], // if _limit exceeds max allowed limit, return max allowed limit
    [{ _limit: '-1' }, 50], // -1 should return all items but max limit is set, so return max allowed limit
    [{}, 20], // if _limit not specified, return default limit
    [{ _limit: 1000 }, 1000], // if max _limit is not specified, return requested _limit
  ])('Sets _limit parameter "%s" correctly', (input, expected) => {
    // for the last test case (_limit=1000) we want to simulate a situation with no max limit set
    // we have to set it here before each test as it seems to run in asynchronously
    strapi.config.api.rest.maxLimit = input._limit === 1000 ? undefined : maxLimit;
    expect(createService.getFetchParams(input)).toMatchObject({
      _limit: expected,
    });
  });
});
