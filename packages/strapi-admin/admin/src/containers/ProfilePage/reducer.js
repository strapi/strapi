/* eslint-disable consistent-return */
import produce from 'immer';
import { pick, set, unset } from 'lodash';

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
        draftState.initialData = pick(action.data, ['email', 'firstname', 'lastname', 'username']);
        draftState.modifiedData = pick(action.data, ['email', 'firstname', 'lastname', 'username']);
        break;
      }
      case 'ON_CANCEL': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'ON_CHANGE': {
        if (action.inputType === 'password' && !action.value) {
          unset(draftState.modifiedData, action.keys.split('.'));
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
        draftState.initialData = pick(action.data, ['email', 'firstname', 'lastname', 'username']);
        draftState.modifiedData = pick(action.data, ['email', 'firstname', 'lastname', 'username']);
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
