/**
 *
 * main reducer
 */
/* eslint-disable consistent-return */
import produce from 'immer';
import { GET_DATA, GET_DATA_SUCCEEDED, RESET_PROPS } from './constants';

const initialState = {
  components: [],
  isLoading: true,
  models: [],
};

const mainReducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case GET_DATA: {
        draftState.isLoading = true;
        break;
      }
      case GET_DATA_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.components = action.components;
        draftState.models = action.models;
        break;
      }
      case RESET_PROPS: {
        return initialState;
      }
      default:
        return draftState;
    }
  });

export default mainReducer;
export { initialState };
