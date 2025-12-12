import { combineReducers } from '@reduxjs/toolkit';

import { reducer as appReducer } from '@content-manager/admin/modules/app';

const reducer = combineReducers({
  app: appReducer,
});

type State = ReturnType<typeof reducer>;

export { reducer };
export type { State };
