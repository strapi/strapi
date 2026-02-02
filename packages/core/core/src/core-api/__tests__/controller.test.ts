import { createController } from '../controller';

describe('Default Controller', () => {
  test('Creates Collection Type default actions', () => {
    const service = {};
    const contentType = {
      modelName: 'testModel',
      kind: 'collectionType',
    };

    const controller = createController({ service, contentType });

    expect(controller).toEqual({
      find: expect.any(Function),
      findOne: expect.any(Function),
      create: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    });
  });

  test('Creates Single Type default actions', () => {
    const service = {};
    const contentType = {
      modelName: 'testModel',
      kind: 'singleType',
    };

    const controller = createController({ service, contentType });

    expect(controller).toEqual({
      find: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    });
  });
});
