import produce from 'immer';
import { getInitData, setInitData, resetInitData } from '../actions';
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
      fieldSizes: {},
    };
  });

  it('should handle the default action correctly', () => {
    expect(mainReducer(state, {})).toEqual(state);
  });

  it('should handle the getInitData action correctly', () => {
    state.status = 'resolved';

    const expected = produce(state, (draft) => {
      draft.status = 'loading';
    });

    expect(mainReducer(state, getInitData())).toEqual(expected);
  });

  it('should handle the setInitData action correctly', () => {
    const authorizedCollectionTypeLinks = [
      {
        name: 'authorizedCt',
        isDisplayed: true,
      },
      {
        name: 'authorizedCt1',
        isDisplayed: false,
      },
    ];
    const authorizedSingleTypeLinks = [
      {
        name: 'authorizedSt',
        isDisplayed: false,
      },
      {
        name: 'authorizedSt1',
        isDisplayed: true,
      },
    ];
    const expected = produce(state, (draft) => {
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
        setInitData({
          authorizedCollectionTypeLinks,
          authorizedSingleTypeLinks,
          contentTypeSchemas: ['test'],
          components: ['test'],
          fieldSizes: {},
        })
      )
    ).toEqual(expected);
  });

  it('should handle the resetInitData action correctly', () => {
    state = 'test';

    expect(mainReducer(state, resetInitData())).toEqual({
      components: [],
      models: [],
      collectionTypeLinks: [],
      singleTypeLinks: [],
      status: 'loading',
    });
  });
});
