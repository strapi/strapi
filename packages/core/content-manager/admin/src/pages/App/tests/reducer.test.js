import produce from 'immer';
import { getData, setContentTypeLinks, resetProps } from '../actions';
import mainReducer from '../reducer';

describe('Content Manager | App | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      components: [],
      status: 'loading',
      models: [],
      collectionTypeLinks: [],
      singleTypeLinks: [],
    };
  });

  it('should handle the default action correctly', () => {
    expect(mainReducer(state, {})).toEqual(state);
  });

  it('should handle the getData action correctly', () => {
    state.status = 'resolved';

    const expected = produce(state, draft => {
      draft.status = 'loading';
    });

    expect(mainReducer(state, getData())).toEqual(expected);
  });

  it('should handle the getData action correctly', () => {
    const expected = produce(state, draft => {
      draft.status = 'resolved';
      draft.components = ['test'];
      draft.models = ['test'];
      draft.collectionTypeLinks = ['authorizedCt'];
      draft.singleTypeLinks = ['authorizedSt'];
    });

    expect(
      mainReducer(
        state,
        setContentTypeLinks(['authorizedCt'], ['authorizedSt'], ['test'], ['test'])
      )
    ).toEqual(expected);
  });

  it('should handle the resetProps action correctly', () => {
    state = 'test';

    expect(mainReducer(state, resetProps())).toEqual({
      components: [],
      models: [],
      collectionTypeLinks: [],
      singleTypeLinks: [],
      status: 'loading',
    });
  });
});
