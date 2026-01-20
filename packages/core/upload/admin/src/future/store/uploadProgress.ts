import { createSlice } from '@reduxjs/toolkit';

export interface UploadProgressState {
  isOpen: boolean;
}

const initialState: UploadProgressState = {
  isOpen: false,
};

const uploadProgressSlice = createSlice({
  name: 'uploadProgress',
  initialState,
  reducers: {
    openUploadProgress(state) {
      state.isOpen = true;
    },
    closeUploadProgress(state) {
      state.isOpen = false;
    },
  },
});

export const { openUploadProgress, closeUploadProgress } = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;
