/* eslint-disable consistent-return */
import produce from 'immer';
import { set, unset } from 'lodash';

const initialState = {
  formErrors: {},
  initialData: {},
  isLoading: true,
  modifiedData: {},
  showHeaderLoader: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.showHeaderLoader = false;
        draftState.initialData = action.data;
        draftState.modifiedData = action.data;
        break;
      }
      case 'ON_CANCEL': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'ON_CHANGE': {
        if (action.inputType === 'password' && !action.value) {
          unset(draftState.modifiedData, action.keys.split('.'));
        } else if (action.keys.includes('username') && !action.value) {
          set(draftState.modifiedData, action.keys.split('.'), null);
        } else {
          set(draftState.modifiedData, action.keys.split('.'), action.value);
        }
        break;
      }
      case 'ON_SUBMIT': {
        draftState.showHeaderLoader = true;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        // TODO fix this and add tests
        draftState.initialData = state.modifiedData;
        draftState.showHeaderLoader = false;
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
