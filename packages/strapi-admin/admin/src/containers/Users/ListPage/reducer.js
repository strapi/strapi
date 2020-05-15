/* eslint-disable consistent-return */
import produce from 'immer';

const initialState = {
  data: [],
  dataToDelete: [],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.data = action.data;
        draftState.isLoading = false;
        break;
      }
      case 'ON_CHANGE_DATA_TO_DELETE': {
        draftState.dataToDelete = action.dataToDelete;
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
