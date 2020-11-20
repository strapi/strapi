'use strict';

const entityManager = require('../entity-manager');

describe('Content-Manager', () => {
  const fakeModel = {
    modelName: 'fake model',
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
        eventHub: { emit: jest.fn() },
        getModel: jest.fn(() => fakeModel),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Publish a content-type', async () => {
      const model = 'application::test.test';
      const entity = { id: 1, published_at: null };
      await entityManager.publish(entity, model);

      expect(strapi.entityService.update).toBeCalledWith(
        { params: { id: entity.id }, data: { published_at: expect.any(Date) } },
        { model }
      );
    });
  });

  describe('Unpublish', () => {
    beforeEach(() => {
      global.strapi = {
        entityService: {
          update: jest.fn(),
        },
        eventHub: { emit: jest.fn() },
        getModel: jest.fn(() => fakeModel),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Unpublish a content-type', async () => {
      const model = 'application::test.test';
      const entity = { id: 1, published_at: new Date() };
      await entityManager.unpublish(entity, model);

      expect(strapi.entityService.update).toHaveBeenCalledWith(
        { params: { id: entity.id }, data: { published_at: null } },
        { model }
      );
    });
  });
});
