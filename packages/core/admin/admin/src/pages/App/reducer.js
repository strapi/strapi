/* eslint-disable consistent-return */
import produce from 'immer';
import { GET_DATA_SUCCEEDED } from './constants';

const initialState = {
  isLoading: true,
  uuid: false,
};

const appReducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case GET_DATA_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.uuid = action.data.uuid;
        break;
      }

      default:
        return draftState;
    }
  });

export default appReducer;
