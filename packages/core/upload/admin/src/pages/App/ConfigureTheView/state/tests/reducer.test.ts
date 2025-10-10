import { ON_CHANGE, SET_LOADED } from '../actionTypes';
import { reducer } from '../reducer';

import type { InitialState } from '../init';

describe('Upload | ConfigureTheView | reducer', () => {
  let state: InitialState | undefined = undefined;

  beforeEach(() => {
    state = {
      initialData: {},
      modifiedData: {},
    };
  });

  it('should handle the default action correctly', () => {
    const expected = state;

    expect(
      reducer(state, {
        type: '',
      })
    ).toEqual(expected);
  });

  describe(`${ON_CHANGE}`, () => {
    it('should set the value related to the passed keys', () => {
      const expected = {
        ...state,
        modifiedData: {
          pageSize: 50,
        },
      };
      const action = { type: ON_CHANGE, keys: 'pageSize', value: 50 };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(`${SET_LOADED}`, () => {
    it('should set the state to loaded', () => {
      state = {
        initialData: {
          pageSize: 50,
        },
        modifiedData: {
          pageSize: 100,
        },
      };
      const expected = {
        ...state,
        initialData: {
          pageSize: 100,
        },
      };
      const action = { type: SET_LOADED };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
