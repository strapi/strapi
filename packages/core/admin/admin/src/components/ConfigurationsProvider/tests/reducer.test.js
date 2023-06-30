import reducer, { initialState } from '../reducer';

describe('ConfigurationsProvider | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  it('should return the initialState', () => {
    const action = { type: undefined };

    expect(reducer(state, action)).toEqual(initialState);
  });

  it('should change logo if logoType exists', () => {
    const action = {
      type: 'UPDATE_PROJECT_SETTINGS',
      values: {
        menuLogo: 'menu-strapi.jpeg',
        authLogo: 'auth-strapi.jpeg',
      },
    };

    const expected = {
      menuLogo: 'menu-strapi.jpeg',
      authLogo: 'auth-strapi.jpeg',
    };

    expect(reducer(state, action)).toEqual(expected);
  });
});
