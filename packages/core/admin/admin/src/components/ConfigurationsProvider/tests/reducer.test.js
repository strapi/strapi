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
      type: 'SET_CUSTOM_LOGO',
      logoType: 'menuLogo',
      value: 'strapi.jpeg',
    };

    const expected = {
      menuLogo: 'strapi.jpeg',
    };

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should return state if logoType does not exist', () => {
    const action = {
      type: 'SET_CUSTOM_LOGO',
      logoType: 'totoLogo',
      value: 'strapi.jpeg',
    };

    expect(reducer(state, action)).toEqual(initialState);
  });
});
