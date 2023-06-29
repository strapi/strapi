import produce from 'immer';

import { SET_APP_RUNTIME_STATUS, SET_ADMIN_PERMISSIONS } from './constants';

const initialState = {
  permissions: {},
  status: 'init',
};

const reducer = (state = initialState, action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_APP_RUNTIME_STATUS: {
        draftState.status = 'runtime';
        break;
      }

      case SET_ADMIN_PERMISSIONS: {
        draftState.permissions = action.payload;
        break;
      }

      default:
        return draftState;
    }
  });

export { initialState };
export default reducer;
