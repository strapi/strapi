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
        draftState.layout = {};
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.layout = action.data;
        draftState.isLoading = false;
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
