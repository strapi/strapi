'use strict';

const _ = require('lodash');
const createService = require('../service');

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
          { populate: undefined, params: { _publicationState: 'live', _limit: defaultLimit } },
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
          { populate: undefined, params: { _publicationState: 'live', _limit: defaultLimit } },
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
          { populate: undefined, params: { _publicationState: 'live', _limit: defaultLimit } },
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
    [`0 if _limit is '0'`, { _limit: '0', maxLimit }, 0],
    ['0 if _limit is 0', { _limit: 0, maxLimit }, 0],
    [`0 if _limit is ''`, { _limit: '', maxLimit }, 0],
    [`1 if _limit is '1'`, { _limit: '1', maxLimit }, 1],
    [
      `${maxLimit} if _limit(500) exceeds max allowed limit (${maxLimit})`,
      { _limit: '500', maxLimit },
      maxLimit,
    ],
    [
      `${maxLimit} if _limit is set to -1 and max allowed limit is set (${maxLimit})`,
      { _limit: '-1', maxLimit },
      maxLimit,
    ],
    [`${defaultLimit} (default) if no _limit is provided`, { maxLimit }, defaultLimit],
    [
      `${defaultLimit} (default) if _limit is undefined`,
      { _limit: undefined, maxLimit },
      defaultLimit,
    ],
    ['1000 if _limit=1000 and no max allowed limit is set', { _limit: 1000 }, 1000],
  ])('Sets _limit parameter to %s', (description, input, expected) => {
    strapi.config.api.rest.maxLimit = input.maxLimit;
    expect(createService.getFetchParams({ _limit: input._limit })).toMatchObject({
      _limit: expected,
    });
  });
});
