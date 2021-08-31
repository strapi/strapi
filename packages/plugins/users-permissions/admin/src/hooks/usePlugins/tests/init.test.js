import init from '../init';

describe('USERS PERMISSIONS | HOOKS | usePlugins | init', () => {
  it('should return the initial state and set the isLoading key to true', () => {
    const initialState = {
      ok: true,
    };

    const expected = {
      ok: true,
      isLoading: true,
    };

    expect(init(initialState, true)).toEqual(expected);
  });

  it('should return the initial state and set the isLoading key to false', () => {
    const initialState = {
      permissions: {},
      routes: {},
      isLoading: null,
    };

    const expected = {
      permissions: {},
      routes: {},
      isLoading: false,
    };

    expect(init(initialState, false)).toEqual(expected);
  });
});
