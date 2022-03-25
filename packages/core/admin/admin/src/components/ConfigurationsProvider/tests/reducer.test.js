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
      type: 'CHANGE_LOGO',
      logoType: 'menuLogo',
      logo: 'strapi.jpeg',
      isCustom: false,
    };

    const expected = {
      menuLogo: {
        logo: 'strapi.jpeg',
        isCustom: false,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should return state if logoType does not exist', () => {
    const action = {
      type: 'CHANGE_LOGO',
      logoType: 'totoLogo',
      logo: 'strapi.jpeg',
      isCustom: false,
    };

    expect(reducer(state, action)).toEqual(initialState);
  });
});
