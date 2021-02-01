/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  locales: [],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.locales = action.data;
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
