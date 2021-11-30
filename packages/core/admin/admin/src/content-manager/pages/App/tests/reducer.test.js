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
    const collectionTypeLinks = [
      {
        name: 'authorizedCt',
        isDisplayed: true,
      },
      {
        name: 'authorizedCt1',
        isDisplayed: false,
      },
    ];
    const singleTypeLinks = [
      {
        name: 'authorizedSt',
        isDisplayed: false,
      },
      {
        name: 'authorizedSt1',
        isDisplayed: true,
      },
    ];
    const expected = produce(state, draft => {
      draft.status = 'resolved';
      draft.components = ['test'];
      draft.models = ['test'];
      draft.collectionTypeLinks = [
        {
          name: 'authorizedCt',
          isDisplayed: true,
        },
      ];
      draft.singleTypeLinks = [
        {
          name: 'authorizedSt1',
          isDisplayed: true,
        },
      ];
    });

    expect(
      mainReducer(
        state,
        setContentTypeLinks(collectionTypeLinks, singleTypeLinks, ['test'], ['test'])
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
