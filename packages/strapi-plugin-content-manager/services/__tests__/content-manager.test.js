'use strict';

const contentManagerService = require('../ContentManager');

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
        eventHub: { emit: jest.fn() },
        getModel: jest.fn(() => fakeModel),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Publish a content-type', async () => {
      const model = 'application::test.test';
      const params = { id: 1 };
      await contentManagerService.publish(params, model);

      expect(strapi.entityService.update).toBeCalledWith(
        { params, data: { published_at: expect.any(String) } },
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
      const params = { id: 1 };
      await contentManagerService.unpublish(params, model);

      expect(strapi.entityService.update).toHaveBeenCalledWith(
        { params, data: { published_at: null } },
        { model }
      );
    });
  });
});
