/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  error: null,
  isLoading: true,
  layout: {},
  layouts: {},
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
        const contentTypeUid = action.data.contentType.uid;

        draftState.isLoading = false;
        draftState.layout = action.data;
        draftState.layouts[contentTypeUid] = action.data;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        draftState.error = action.error;
        break;
      }
      case 'SET_LAYOUT_FROM_STATE': {
        draftState.error = null;
        draftState.layout = state.layouts[action.uid];
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
