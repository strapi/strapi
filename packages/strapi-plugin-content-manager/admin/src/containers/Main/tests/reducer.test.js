import produce from 'immer';
import { getData, getDataSucceeded, resetProps } from '../actions';
import mainReducer from '../reducer';

describe('Content Manager | Main | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      components: [],
      isLoading: true,
      models: [],
    };
  });

  it('should handle the default action correctly', () => {
    expect(mainReducer(state, {})).toEqual(state);
  });

  it('should handle the getData action correctly', () => {
    state.isLoading = false;

    const expected = produce(state, draft => {
      draft.isLoading = true;
    });

    expect(mainReducer(state, getData())).toEqual(expected);
  });

  it('should handle the getData action correctly', () => {
    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.components = ['test'];
      draft.models = ['test'];
    });

    expect(mainReducer(state, getDataSucceeded(['test'], ['test']))).toEqual(expected);
  });

  it('should handle the resetProps action correctly', () => {
    state = 'test';

    expect(mainReducer(state, resetProps())).toEqual({
      components: [],
      models: [],
      isLoading: true,
    });
  });
});
