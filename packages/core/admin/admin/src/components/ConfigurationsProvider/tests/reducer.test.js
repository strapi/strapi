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
        menuLogo: 'strapi.jpeg',
      },
    };

    const expected = {
      menuLogo: 'strapi.jpeg',
    };

    expect(reducer(state, action)).toEqual(expected);
  });
});
