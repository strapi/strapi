/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  role: {},
  permissions: {},
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.role = action.role;
        draftState.permissions = action.permissions;
        draftState.isLoading = false;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.role.name = action.name;
        draftState.role.description = action.description;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
