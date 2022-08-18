'use strict';

const entityManagerLoader = require('../entity-manager');

let entityManager;

describe('Content-Manager', () => {
  const fakeModel = {
    modelName: 'fake model',
    attributes: {},
  };

  describe('Publish', () => {
    beforeEach(() => {
      global.strapi = {
        entityService: {
          update: jest.fn(),
        },
        entityValidator: {
          validateEntityCreation() {},
        },
        eventHub: { emit: jest.fn(), sanitizeEntity: (entity) => entity },
        getModel: jest.fn(() => fakeModel),
      };
      entityManager = entityManagerLoader({ strapi });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Publish a content-type', async () => {
      const uid = 'api::test.test';
      const entity = { id: 1, publishedAt: null };
      await entityManager.publish(entity, {}, uid);

      expect(strapi.entityService.update).toBeCalledWith(uid, entity.id, {
        data: { publishedAt: expect.any(Date) },
        populate: {},
      });
    });
  });

  describe('Unpublish', () => {
    beforeEach(() => {
      global.strapi = {
        entityService: {
          update: jest.fn(),
        },
        eventHub: { emit: jest.fn(), sanitizeEntity: (entity) => entity },
        getModel: jest.fn(() => fakeModel),
      };
      entityManager = entityManagerLoader({ strapi });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Unpublish a content-type', async () => {
      const uid = 'api::test.test';
      const entity = { id: 1, publishedAt: new Date() };
      await entityManager.unpublish(entity, {}, uid);

      expect(strapi.entityService.update).toHaveBeenCalledWith(uid, entity.id, {
        data: { publishedAt: null },
        populate: {},
      });
    });
  });
});
