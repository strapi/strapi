import init from '../init';

describe('UPLOAD | hooks | useUserPermissions | init', () => {
  it('should return the initialState and the allowedActions', () => {
    const initialState = {
      isLoading: true,
    };
    const expected = {
      isLoading: true,
      allowedActions: {},
    };

    expect(init(initialState, [])).toEqual(expected);
  });

  it('should return an object with the allowedActions set properly', () => {
    const initialState = {
      isLoading: true,
    };
    const expected = {
      isLoading: true,
      allowedActions: {
        canRead: false,
        canUpdate: false,
      },
    };

    const data = ['read', 'update'];

    expect(init(initialState, data)).toEqual(expected);
  });
});
