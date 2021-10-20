import getConditionsButtonState from '../getConditionsButtonState';

describe('ADMIN | COMPONENTS | Permissions | PluginsAndSettings | SubCategories | utils | getConditionsButtonState', () => {
  it('should return false when all conditions leafs are falsy', () => {
    const data = {
      test: {
        properties: {
          enabled: true,
        },
        conditions: { foo: false, bar: false },
      },
    };

    expect(getConditionsButtonState(data)).toBeFalsy();
  });

  it('should return true when one condition leaf is truthy', () => {
    const data = {
      test: {
        properties: {
          enabled: true,
        },
        conditions: { foo: true, bar: false },
      },
    };

    expect(getConditionsButtonState(data)).toBeTruthy();
  });
});
