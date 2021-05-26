import reducer, { initialState } from '../reducer';

describe('Upload | components | FiltersCard | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  it('should return the initialState', () => {
    expect(reducer(state, {})).toEqual(state);
  });

  it('should return the state with the default value', () => {
    const action = {
      type: 'ON_CHANGE',
      name: 'name',
      value: 'size',
    };

    const actual = reducer(state, action);
    const expected = {
      ...state,
      name: 'size',
      value: '0KB',
    };
    // const expected = state.set('name', 'size').set('value', '0KB');

    expect(actual).toEqual(expected);
  });

  it('should return the state with the updated value', () => {
    const action = {
      type: 'ON_CHANGE',
      name: 'filter',
      value: '>',
    };

    const actual = reducer(state, action);

    const expected = { ...state, filter: '>' };

    expect(actual).toEqual(expected);
  });

  it('should return the initialState on reset', () => {
    state = { ...state, filter: '>' };

    const action = {
      type: 'RESET_FORM',
    };

    const actual = reducer(state, action);
    const expected = initialState;

    expect(actual).toEqual(expected);
  });
});
