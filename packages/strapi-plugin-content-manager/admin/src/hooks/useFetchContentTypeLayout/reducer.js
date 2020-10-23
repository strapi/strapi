/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  error: null,
  isLoading: true,
  layout: {},
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.error = null;
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.layout = action.data;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        draftState.error = action.error;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
