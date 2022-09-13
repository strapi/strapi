import produce from 'immer';
import reducer from '../reducer';

describe('CONTENT MANAGER | hooks | useFetchContentTypeLayout | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      error: null,
      isLoading: true,
      layout: {},
      layouts: {},
    };
  });

  it('should handle the default case correctly', () => {
    expect(reducer(state, { type: 'test' })).toEqual(state);
  });

  it('should handle the GET_DATA action correctly', () => {
    state.isLoading = false;
    state.error = true;

    const action = { type: 'GET_DATA' };

    const expected = produce(state, (draft) => {
      draft.isLoading = true;
      draft.error = null;
    });

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should handle the GET_DATA_SUCCEEDED action correctly', () => {
    const action = {
      type: 'GET_DATA_SUCCEEDED',
      data: { contentType: { uid: 'test' } },
    };

    const expected = produce(state, (draft) => {
      draft.isLoading = false;
      draft.layout = { contentType: { uid: 'test' } };
      draft.layouts = { test: { contentType: { uid: 'test' } } };
    });

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should handle the GET_DATA_ERROR action correctly', () => {
    const action = {
      type: 'GET_DATA_ERROR',
      error: true,
    };

    const expected = produce(state, (draft) => {
      draft.isLoading = false;
      draft.error = true;
    });

    expect(reducer(state, action)).toEqual(expected);
  });
});
