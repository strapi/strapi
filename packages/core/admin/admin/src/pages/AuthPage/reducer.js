import produce from 'immer';
import { set } from 'lodash';
/* eslint-disable consistent-return */

const initialState = {
  formErrors: {},
  modifiedData: {},
  requestError: null,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        set(draftState.modifiedData, action.keys.split('.'), action.value);
        break;
      }
      case 'RESET_PROPS': {
        return initialState;
      }
      case 'SET_DATA': {
        draftState.modifiedData = action.data;
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        break;
      }
      case 'SET_REQUEST_ERROR': {
        draftState.requestError = {
          errorMessage: action.errorMessage,
          errorStatus: action.errorStatus,
        };
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
