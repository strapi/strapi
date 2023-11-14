import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { getFetchClient } from '@strapi/helper-plugin';

import { RootState } from '../store/store';

export interface Release {
  name: string;
}

export interface ReleaseState {
  loading: boolean;
  releases: Array<Release>;
  error: string | undefined;
}

const initialState: ReleaseState = {
  loading: false,
  releases: [],
  error: undefined,
};

export const createRelease = createAsyncThunk(
  'content-releases/createRelease',
  async (newRelease: Release) => {
    const { post } = getFetchClient();

    const { data } = await post('/content-releases', newRelease);

    return data.data;
  }
);

const releaseSlice = createSlice({
  name: 'release',
  initialState,
  extraReducers: (builder: ActionReducerMapBuilder<ReleaseState>) => {
    builder.addCase(createRelease.pending, (state: ReleaseState) => {
      state.loading = true;
    });
    builder.addCase(createRelease.fulfilled, (state, action: PayloadAction<Release>) => {
      state.loading = false;
      state.releases.push(action.payload);
    });
    builder.addCase(createRelease.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });
  },
  reducers: {},
});

export const releaseSelector = (state: RootState) => state.releaseReducer;

export const releaseReducer = releaseSlice.reducer;
