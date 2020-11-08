'use strict';
const createController = require('../controller');

describe('Default Controller', () => {
  test('Creates Collection Type default actions', () => {
    const service = {};
    const model = {
      modelName: 'testModel',
      kind: 'collectionType',
    };

    const controller = createController({ service, model });

    expect(controller).toEqual({
      find: expect.any(Function),
      findOne: expect.any(Function),
      count: expect.any(Function),
      create: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    });
  });

  test('Creates Single Type default actions', () => {
    const service = {};
    const model = {
      modelName: 'testModel',
      kind: 'singleType',
    };

    const controller = createController({ service, model });

    expect(controller).toEqual({
      find: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    });
  });
});
