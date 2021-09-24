/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  permissions: {},
  routes: {},
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.permissions = {};
        draftState.routes = {};
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.permissions = action.permissions;
        draftState.routes = action.routes;
        draftState.isLoading = false;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
