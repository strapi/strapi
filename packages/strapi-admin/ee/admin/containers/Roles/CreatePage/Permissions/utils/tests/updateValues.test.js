import updateValues from '../updateValues';

describe('ADMIN | COMPONENTS | Permissions | utils | updateValues', () => {
  it('should not the conditions values of given object', () => {
    const simpleObject = {
      enabled: true,
      conditions: 'test',
    };
    const expected = {
      enabled: false,
      conditions: 'test',
    };

    expect(updateValues(simpleObject, false)).toEqual(expected);
  });

  it('set the deepest values of an object with the second argument passed to the function', () => {
    const complexeObject = {
      enabled: true,
      conditions: 'test',
      f1: {
        enabled: true,
        f1: {
          conditions: 'test',
          enabled: false,
          f2: {
            enabled: true,
          },
        },
      },
    };
    const expected = {
      enabled: false,
      conditions: 'test',
      f1: {
        enabled: false,
        f1: {
          conditions: 'test',
          enabled: false,
          f2: {
            enabled: false,
          },
        },
      },
    };

    expect(updateValues(complexeObject, false)).toEqual(expected);
  });
});
