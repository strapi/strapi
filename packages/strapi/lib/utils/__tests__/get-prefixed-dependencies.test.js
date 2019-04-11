const getPrefixedDeps = require('../get-prefixed-dependencies');

describe('getPrefixedDeps', () => {
  test('Returns a list of the dependencies and removes the prefix', () => {
    expect(
      getPrefixedDeps('test-prefix', {
        dependencies: {
          'test-prefix-coucou': '1',
        },
      })
    ).toEqual(['coucou']);
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
