'use strict';

const { omit } = require('../../services/utils');

describe('Utils', () => {
  test('Omit key from object', async () => {
    const foo = {
      bar: 123,
      baz: 'test',
    };

    const result = omit(foo, ['baz']);

    expect(result).toStrictEqual({
      bar: 123,
    });
  });
});
