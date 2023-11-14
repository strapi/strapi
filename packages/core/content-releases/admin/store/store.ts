import { configureStore } from '@reduxjs/toolkit';

import { releaseReducer } from '../modules/releaseSlice';
export const store = configureStore({
  reducer: {
    // our reducers goes here
    releaseReducer,
  },
});

export type CreatedStore = typeof store;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<CreatedStore['getState']>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type Dispatch = CreatedStore['dispatch'];
