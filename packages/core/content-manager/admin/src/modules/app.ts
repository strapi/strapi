import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { GetInitData } from '../../../shared/contracts/init';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';

interface AppState {
  adminUserId?: string | number;
  collectionTypeLinks: ContentManagerLink[];
  components: GetInitData.Response['data']['components'];
  contentStructure?: GetInitData.Response['data']['contentStructure'];
  fieldSizes: GetInitData.Response['data']['fieldSizes'];
  models: GetInitData.Response['data']['contentTypes'];
  singleTypeLinks: ContentManagerLink[];
  isLoading: boolean;
}

const initialState: AppState = {
  adminUserId: undefined,
  collectionTypeLinks: [],
  components: [],
  contentStructure: undefined,
  fieldSizes: {},
  models: [],
  singleTypeLinks: [],
  isLoading: true,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialData(
      state,
      action: PayloadAction<{
        adminUserId?: AppState['adminUserId'];
        authorizedCollectionTypeLinks: AppState['collectionTypeLinks'];
        authorizedSingleTypeLinks: AppState['singleTypeLinks'];
        components: AppState['components'];
        contentStructure?: AppState['contentStructure'];
        contentTypeSchemas: AppState['models'];
        fieldSizes: AppState['fieldSizes'];
      }>
    ) {
      const {
        adminUserId,
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
        components,
        contentStructure,
        contentTypeSchemas,
        fieldSizes,
      } = action.payload;
      state.adminUserId = adminUserId;
      state.collectionTypeLinks = authorizedCollectionTypeLinks.filter(
        ({ isDisplayed }) => isDisplayed
      );
      state.singleTypeLinks = authorizedSingleTypeLinks.filter(({ isDisplayed }) => isDisplayed);
      state.components = components;
      state.contentStructure = contentStructure;
      state.models = contentTypeSchemas;
      state.fieldSizes = fieldSizes;
      state.isLoading = false;
    },
    resetInitialData() {
      return initialState;
    },
  },
});

const { actions, reducer } = appSlice;
const { resetInitialData, setInitialData } = actions;

export { initialState, reducer, resetInitialData, setInitialData };
export type { AppState };
