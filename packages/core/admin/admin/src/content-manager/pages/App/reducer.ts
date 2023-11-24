import produce from 'immer';

import { createTypedSelector } from '../../../core/store/hooks';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

/* -------------------------------------------------------------------------------------------------
 * Action types
 * -----------------------------------------------------------------------------------------------*/

const GET_INIT_DATA = 'ContentManager/App/GET_INIT_DATA';
const RESET_INIT_DATA = 'ContentManager/App/RESET_INIT_DATA';
const SET_INIT_DATA = 'ContentManager/App/SET_INIT_DATA';

/* -------------------------------------------------------------------------------------------------
 * Actions
 * -----------------------------------------------------------------------------------------------*/

interface GetInitDataAction {
  type: typeof GET_INIT_DATA;
}

const getInitData = () =>
  ({
    type: GET_INIT_DATA,
  } satisfies GetInitDataAction);

interface ResetInitDataAction {
  type: typeof RESET_INIT_DATA;
}

const resetInitData = () => ({ type: RESET_INIT_DATA } satisfies ResetInitDataAction);

interface SetInitDataAction {
  type: typeof SET_INIT_DATA;
  data: {
    authorizedCollectionTypeLinks: ContentManagerAppState['collectionTypeLinks'];
    authorizedSingleTypeLinks: ContentManagerAppState['singleTypeLinks'];
    components: ContentManagerAppState['components'];
    contentTypeSchemas: ContentManagerAppState['models'];
    fieldSizes: ContentManagerAppState['fieldSizes'];
  };
}

const setInitData = (data: SetInitDataAction['data']) =>
  ({
    type: SET_INIT_DATA,
    data,
  } satisfies SetInitDataAction);

type Action = GetInitDataAction | ResetInitDataAction | SetInitDataAction;

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

interface ContentManagerAppState {
  collectionTypeLinks: unknown[];
  components: Contracts.Init.GetInitData.Response['data']['data']['components'];
  fieldSizes: Contracts.Init.GetInitData.Response['data']['data']['fieldSizes'];
  models: Contracts.Init.GetInitData.Response['data']['data']['contentTypes'];
  singleTypeLinks: unknown[];
  status: 'loading' | 'resolved' | 'error';
}

const initialState = {
  collectionTypeLinks: [],
  components: [],
  fieldSizes: {},
  models: [],
  singleTypeLinks: [],
  status: 'loading',
} satisfies ContentManagerAppState;

const reducer = (state: ContentManagerAppState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_INIT_DATA: {
        draftState.status = 'loading';
        break;
      }
      case RESET_INIT_DATA: {
        return initialState;
      }
      case SET_INIT_DATA: {
        draftState.collectionTypeLinks = action.data.authorizedCollectionTypeLinks.filter(
          // @ts-expect-error – not typed yet
          ({ isDisplayed }) => isDisplayed
        );
        draftState.singleTypeLinks = action.data.authorizedSingleTypeLinks.filter(
          // @ts-expect-error – not typed yet
          ({ isDisplayed }) => isDisplayed
        );
        // @ts-expect-error – recursive type...
        draftState.components = action.data.components;
        draftState.models = action.data.contentTypeSchemas;
        draftState.fieldSizes = action.data.fieldSizes;
        draftState.status = 'resolved';
        break;
      }
      default:
        return draftState;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * Selectors
 * -----------------------------------------------------------------------------------------------*/

const selectApp = createTypedSelector((state) => {
  return state['content-manager_app'];
});

const selectModels = createTypedSelector((state) => state['content-manager_app'].models);

const selectModelLinks = createTypedSelector((state) => ({
  collectionTypeLinks: state['content-manager_app'].collectionTypeLinks,
  singleTypeLinks: state['content-manager_app'].singleTypeLinks,
}));

const selectModelAndComponentSchemas = createTypedSelector((state) => {
  const { components, models } = state['content-manager_app'];

  return {
    schemas: [...components, ...models],
  };
});

const selectFieldSizes = createTypedSelector((state) => state['content-manager_app'].fieldSizes);

export {
  reducer,
  getInitData,
  resetInitData,
  setInitData,
  selectApp,
  selectModels,
  selectModelLinks,
  selectModelAndComponentSchemas,
  selectFieldSizes,
};
export type { ContentManagerAppState };
