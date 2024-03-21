import { combineReducers } from '@reduxjs/toolkit';

import { contentManagerApi } from '../services/api';

import { reducer as appReducer } from './app';
import { reducer as rbacReducer } from './rbac';

const reducer = combineReducers({
  app: appReducer,
  rbac: rbacReducer,
  [contentManagerApi.reducerPath]: contentManagerApi.reducer,
});

type State = ReturnType<typeof reducer>;

export { reducer };
export type { State };
