'use strict';

const _ = require('lodash');
const entityManagerLoader = require('../entity-manager');

let entityManager;

const queryUpdateMock = jest.fn(() => Promise.resolve());
describe('Content-Manager', () => {
  const fakeModel = {
    modelName: 'fake model',
    attributes: {},
  };

  describe('Publish', () => {
    const defaultConfig = {};
    beforeEach(() => {
      global.strapi = {
        entityService: {
          findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
          update: jest.fn().mockReturnValue({ id: 1, publishedAt: new Date() }),
        },
        db: {
          query: jest.fn(() => ({
            updateMany: queryUpdateMock,
          })),
        },
        entityValidator: {
          validateEntityCreation() {},
          validateEntityUpdate: jest.fn().mockReturnValue([{ id: 1 }, { id: 2 }]),
        },
        eventHub: { emit: jest.fn(), sanitizeEntity: (entity) => entity },
        getModel: jest.fn(() => fakeModel),
        config: {
          get: (path, defaultValue) => _.get(defaultConfig, path, defaultValue),
        },
        webhookStore: {
          allowedEvents: new Map([['ENTRY_PUBLISH', 'entry.publish']]),
        },
        plugins: {
          'content-manager': {
            services: {
              'populate-builder': require('../populate-builder')(),
            },
          },
        },
      };
      entityManager = entityManagerLoader({ strapi });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Publish a single entity for a content-type', async () => {
      const uid = 'api::test.test';
      const entity = { id: 1, publishedAt: null };
      await entityManager.publish(entity, uid, {});

      expect(strapi.entityService.update).toBeCalledWith(uid, entity.id, {
        data: { publishedAt: expect.any(Date) },
        populate: {},
      });
      expect(strapi.eventHub.emit).toBeCalledWith('entry.publish', {
        model: fakeModel.modelName,
        entry: {
          id: 1,
          publishedAt: expect.any(Date),
        },
      });
    });

    test('Publish many entities for a content-type', async () => {
      const uid = 'api::test.test';
      const entities = [
        { id: 1, publishedAt: null },
        { id: 2, publishedAt: null },
      ];

      strapi.entityService.findMany.mockResolvedValueOnce([
        { id: 1, publishedAt: new Date() },
        { id: 2, publishedAt: new Date() },
      ]);

      await entityManager.publishMany(entities, uid);

      expect(strapi.db.query().updateMany).toHaveBeenCalledWith({
        where: {
          id: { $in: [1, 2] },
        },
        data: { publishedAt: expect.any(Date) },
      });
      expect(strapi.entityService.findMany).toHaveBeenCalledWith(uid, {
        filters: {
          id: { $in: [1, 2] },
        },
        populate: {},
      });
      expect(strapi.eventHub.emit.mock.calls).toEqual([
        [
          'entry.publish',
          { model: fakeModel.modelName, entry: { id: 1, publishedAt: expect.any(Date) } },
        ],
        [
          'entry.publish',
          { model: fakeModel.modelName, entry: { id: 2, publishedAt: expect.any(Date) } },
        ],
      ]);
    });

    test('Publish many entities for a content-type with mixed publishedAt state', async () => {
      const uid = 'api::test.test';
      const entities = [
        { id: 1, publishedAt: new Date() },
        { id: 2, publishedAt: null },
      ];

      strapi.entityService.findMany.mockResolvedValueOnce([{ id: 2, publishedAt: new Date() }]);

      await entityManager.publishMany(entities, uid);

      expect(strapi.db.query().updateMany).toHaveBeenCalledWith({
        where: {
          id: { $in: [2] },
        },
        data: { publishedAt: expect.any(Date) },
      });
      expect(strapi.entityService.findMany).toHaveBeenCalledWith(uid, {
        filters: {
          id: { $in: [2] },
        },
        populate: {},
      });
      expect(strapi.eventHub.emit.mock.calls).toEqual([
        [
          'entry.publish',
          { model: fakeModel.modelName, entry: { id: 2, publishedAt: expect.any(Date) } },
        ],
      ]);
    });
  });

  describe('Unpublish', () => {
    const defaultConfig = {};
    beforeEach(() => {
      global.strapi = {
        db: {
          query: jest.fn(() => ({
            updateMany: queryUpdateMock,
          })),
        },
        entityService: {
          findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
          update: jest.fn().mockReturnValue({ id: 1, publishedAt: null }),
        },
        eventHub: { emit: jest.fn(), sanitizeEntity: (entity) => entity },
        getModel: jest.fn(() => fakeModel),
        config: {
          get: (path, defaultValue) => _.get(defaultConfig, path, defaultValue),
        },
        webhookStore: {
          allowedEvents: new Map([['ENTRY_UNPUBLISH', 'entry.unpublish']]),
        },
        plugins: {
          'content-manager': {
            services: {
              'populate-builder': require('../populate-builder')(),
            },
          },
        },
      };
      entityManager = entityManagerLoader({ strapi });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Unpublish a single entity for a content-type', async () => {
      const uid = 'api::test.test';
      const entity = { id: 1, publishedAt: new Date() };
      await entityManager.unpublish(entity, uid, {});

      expect(strapi.entityService.update).toHaveBeenCalledWith(uid, entity.id, {
        data: { publishedAt: null },
        populate: {},
      });
      expect(strapi.eventHub.emit).toBeCalledWith('entry.unpublish', {
        model: fakeModel.modelName,
        entry: {
          id: 1,
          publishedAt: null,
        },
      });
    });

    test('Unpublish many entities for a content-type', async () => {
      const uid = 'api::test.test';
      const entities = [
        { id: 1, publishedAt: new Date() },
        { id: 2, publishedAt: new Date() },
      ];

      strapi.entityService.findMany.mockResolvedValueOnce([
        { id: 1, publishedAt: null },
        { id: 2, publishedAt: null },
      ]);

      await entityManager.unpublishMany(entities, uid);

      expect(strapi.db.query().updateMany).toHaveBeenCalledWith({
        where: {
          id: { $in: [1, 2] },
        },
        data: { publishedAt: null },
      });
      expect(strapi.entityService.findMany).toHaveBeenCalledWith(uid, {
        filters: {
          id: { $in: [1, 2] },
        },
        populate: {},
      });
      expect(strapi.eventHub.emit.mock.calls).toEqual([
        ['entry.unpublish', { model: fakeModel.modelName, entry: { id: 1, publishedAt: null } }],
        ['entry.unpublish', { model: fakeModel.modelName, entry: { id: 2, publishedAt: null } }],
      ]);
    });

    test('Unpublish many entities for a content-type with a mixed publishedAt state', async () => {
      const uid = 'api::test.test';
      const entities = [
        { id: 1, publishedAt: new Date() },
        { id: 2, publishedAt: null },
      ];

      strapi.entityService.findMany.mockResolvedValueOnce([{ id: 1, publishedAt: null }]);

      await entityManager.unpublishMany(entities, uid);

      expect(strapi.db.query().updateMany).toHaveBeenCalledWith({
        where: {
          id: { $in: [1] },
        },
        data: { publishedAt: null },
      });
      expect(strapi.entityService.findMany).toHaveBeenCalledWith(uid, {
        filters: {
          id: { $in: [1] },
        },
        populate: {},
      });
      expect(strapi.eventHub.emit.mock.calls).toEqual([
        ['entry.unpublish', { model: fakeModel.modelName, entry: { id: 1, publishedAt: null } }],
      ]);
    });
  });
});
