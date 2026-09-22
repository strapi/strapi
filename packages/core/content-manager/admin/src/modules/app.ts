import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { GetInitData } from '../../../shared/contracts/init';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';

interface AppState {
  collectionTypeLinks: ContentManagerLink[];
  components: GetInitData.Response['data']['components'];
  fieldSizes: GetInitData.Response['data']['fieldSizes'];
  models: GetInitData.Response['data']['contentTypes'];
  singleTypeLinks: ContentManagerLink[];
  isLoading: boolean;
}

const initialState: AppState = {
  collectionTypeLinks: [],
  components: [],
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
        authorizedCollectionTypeLinks: AppState['collectionTypeLinks'];
        authorizedSingleTypeLinks: AppState['singleTypeLinks'];
        components: AppState['components'];
        contentTypeSchemas: AppState['models'];
        fieldSizes: AppState['fieldSizes'];
      }>
    ) {
      const {
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
        components,
        contentTypeSchemas,
        fieldSizes,
      } = action.payload;
      state.collectionTypeLinks = authorizedCollectionTypeLinks.filter(
        ({ isDisplayed }) => isDisplayed
      );
      state.singleTypeLinks = authorizedSingleTypeLinks.filter(({ isDisplayed }) => isDisplayed);
      state.components = components;
      state.models = contentTypeSchemas;
      state.fieldSizes = fieldSizes;
      state.isLoading = false;
    },
  },
});

const { actions, reducer } = appSlice;
const { setInitialData } = actions;

export { reducer, setInitialData };
export type { AppState };
