import init from '../init';

describe('USERS PERMISSIONS | HOOKS | useRolesList | init', () => {
  it('should return the initial state and set the isLoading key to true', () => {
    const initialState = {
      roles: [],
      isLoading: null,
    };

    const expected = {
      roles: [],
      isLoading: true,
    };

    expect(init(initialState, true)).toEqual(expected);
  });

  it('should return the initial state and set the isLoading key to false', () => {
    const initialState = {
      roles: [],
      isLoading: null,
    };

    const expected = {
      roles: [],
      isLoading: false,
    };

    expect(init(initialState, false)).toEqual(expected);
  });
});
