import produce from 'immer';
import { getData, getDataSucceeded } from '../actions';

import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | ListView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      data: [],
      isLoading: true,
      contentType: {},
      initialDisplayedHeaders: [],
      displayedHeaders: [],
      pagination: {
        total: 0,
      },
    };
  });

  it('should handle the default action correctly', () => {
    const expected = state;
    state = {};

    expect(reducer(undefined, {})).toEqual(expected);
  });

  describe('GET_DATA', () => {
    it('should return getData action correctly', () => {
      state.contentType = 'test';
      state.initialDisplayedHeaders = ['test'];
      state.displayedHeaders = ['test'];
      state.isLoading = false;

      const expected = produce(state, draft => {
        draft.data = [];
        draft.isLoading = true;
        draft.contentType = 'test';
        draft.initialDisplayedHeaders = ['test'];
        draft.displayedHeaders = ['test'];
      });

      expect(reducer(state, getData())).toEqual(expected);
    });
  });

  it('should handle the getDataSucceeded action correctly', () => {
    const expected = produce(state, draft => {
      draft.pagination = { count: 1 };
      draft.data = ['test'];
      draft.isLoading = false;
    });

    expect(reducer(state, getDataSucceeded({ count: 1 }, ['test']))).toEqual(expected);
  });
});
