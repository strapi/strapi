import init from '../init';

describe('HELPER_PLUGIN | hooks | useRBAC | init', () => {
  it('should return the correct state with an empty allowedActions object', () => {
    const expected = {
      isLoading: true,
      allowedActions: {},
    };

    expect(init([])).toEqual(expected);
  });

  it('should return an object with the allowedActions set properly', () => {
    const expected = {
      isLoading: true,
      allowedActions: {
        canRead: false,
        canUpdate: false,
      },
    };

    const data = ['read', 'update'];

    expect(init(data)).toEqual(expected);
  });
});
