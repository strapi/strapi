import { combineReducers } from '@reduxjs/toolkit';

import { reducer as rbacReducer } from './rbac';

const reducer = combineReducers({
  rbac: rbacReducer,
});

export { reducer };
