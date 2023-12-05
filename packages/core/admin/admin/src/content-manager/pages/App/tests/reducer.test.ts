import produce from 'immer';

import {
  ContentManagerAppState,
  reducer as mainReducer,
  getInitData,
  resetInitData,
  setInitData,
} from '../reducer';

describe('Content Manager | App | reducer', () => {
  let state: ContentManagerAppState;

  beforeEach(() => {
    state = {
      components: [],
      status: 'loading',
      models: [],
      collectionTypeLinks: [],
      singleTypeLinks: [],
      fieldSizes: {},
    } satisfies ContentManagerAppState;
  });

  it('should handle the default action correctly', () => {
    // @ts-expect-error – testing default case
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
      // @ts-expect-error – fix this?
      draft.components = ['test'];
      // @ts-expect-error – fix this?
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
          // @ts-expect-error – fix this?
          contentTypeSchemas: ['test'],
          // @ts-expect-error – fix this?
          components: ['test'],
          fieldSizes: {},
        })
      )
    ).toEqual(expected);
  });

  it('should handle the resetInitData action correctly', () => {
    // @ts-expect-error – fix this?
    state = 'test';

    expect(mainReducer(state, resetInitData())).toEqual({
      components: [],
      models: [],
      fieldSizes: {},
      collectionTypeLinks: [],
      singleTypeLinks: [],
      status: 'loading',
    });
  });
});
