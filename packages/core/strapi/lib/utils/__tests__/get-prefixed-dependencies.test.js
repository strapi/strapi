'use strict';

const getPrefixedDeps = require('../get-prefixed-dependencies');

describe('getPrefixedDeps', () => {
  test('Returns a list of the dependencies and removes the prefix', () => {
    expect(
      getPrefixedDeps('test-prefix', {
        dependencies: {
          'test-prefix-packagename': '1',
        },
      })
    ).toEqual(['packagename']);
  });

  test('Ignores exact names', () => {
    expect(
      getPrefixedDeps('test-prefix', {
        dependencies: {
          'test-prefix': '1',
        },
      })
    ).toEqual([]);
  });
});
