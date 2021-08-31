import init from '../init';

describe('USERS PERMISSIONS | COMPONENTS | Permissions | init', () => {
  it('should return the initialState and an empty collapses array if the permissions object is empty', () => {
    const initialState = {
      ok: true,
    };
    const expected = {
      ok: true,
      collapses: [],
    };

    expect(init(initialState, {})).toEqual(expected);
  });

  it('should return an object with a sorted array of permissions', () => {
    const permissions = {
      zgraphql: { ok: true },
      app: { ok: true },
      graphql: { ok: true },
    };

    const expected = {
      collapses: [
        { name: 'app', isOpen: true },
        { name: 'graphql', isOpen: false },
        { name: 'zgraphql', isOpen: false },
      ],
    };

    expect(init({}, permissions)).toEqual(expected);
  });
});
