'use strict';

const pickWritableAttributes = require('../pick-writable-attributes');

describe('pickWritableAttributes', () => {
  const getModelMock = jest.fn();
  beforeEach(() => {
    getModelMock.mockClear();
    global.strapi = {
      getModel: getModelMock,
    };
  });

  test('should return a function', () => {
    getModelMock.mockReturnValue(undefined);
    expect(pickWritableAttributes({ model: 'test' })).toBeInstanceOf(Function);
  });

  test('should return a full object if the model is not found', () => {
    getModelMock.mockReturnValue(undefined);

    const data = {
      test: 'test',
    };

    const picker = pickWritableAttributes({ model: 'test' });

    expect(picker(data)).toEqual(data);
  });

  test('should pick writable fields only', () => {
    getModelMock.mockReturnValue({
      attributes: {
        foo: {
          writable: true,
        },
        bar: {
          writable: false,
        },
      },
    });

    const data = {
      foo: 'foo',
      bar: 'bar',
    };

    const picker = pickWritableAttributes({ model: 'test' });

    expect(picker(data)).toEqual({ foo: 'foo' });
  });
});
