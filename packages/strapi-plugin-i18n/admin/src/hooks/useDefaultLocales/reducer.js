/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  defaultLocales: undefined,
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;

        return draftState;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.defaultLocales = action.data;
        draftState.isLoading = false;

        return draftState;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;

        return draftState;
      }
      default:
        return draftState;
    }
  });

export default reducer;
