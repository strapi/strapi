import { combineReducers } from '@reduxjs/toolkit';

import { reducer as appReducer } from './app';
import { reducer as rbacReducer } from './rbac';

const reducer = combineReducers({
  app: appReducer,
  rbac: rbacReducer,
});

type State = ReturnType<typeof reducer>;

export { reducer };
export type { State };
