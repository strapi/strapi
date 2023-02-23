'use strict';

const stringifyDeep = require('../stringify-deep');

describe('stringifyDeep', () => {
  test('Stringifies recursively', () => {
    const input = {
      property: 15,
      subObject: {
        property: 'test',
        number: 81,
        boolean: true,
      },
      arrayValue: ['valueA', 'valueB'],
    };

    expect(stringifyDeep(input)).toStrictEqual({
      property: '15',
      subObject: {
        property: 'test',
        number: '81',
        boolean: 'true',
      },
      arrayValue: ['valueA', 'valueB'],
    });
  });
});
