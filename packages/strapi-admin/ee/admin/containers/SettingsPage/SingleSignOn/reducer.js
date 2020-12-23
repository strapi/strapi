/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';

const initialState = {
  formErrors: {},
  initialData: {},
  modifiedData: {},
  isLoading: true,
  showHeaderButtonLoader: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.initialData = {};
        draftState.modifiedData = {};
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.initialData = action.data;
        draftState.modifiedData = action.data;
        break;
      }
      case 'ON_CHANGE': {
        set(draftState.modifiedData, action.keys.split('.'), action.value);
        draftState.formErrors = {};
        break;
      }
      case 'ON_CANCEL': {
        draftState.modifiedData = state.initialData;
        draftState.formErrors = {};
        break;
      }
      case 'ON_SUBMIT': {
        draftState.showHeaderButtonLoader = true;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.initialData = action.data;
        draftState.modifiedData = action.data;
        draftState.showHeaderButtonLoader = false;
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        // draftState.showHeaderButtonLoader = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
