/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  roles: [],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.roles = [];
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.roles = action.data;
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
