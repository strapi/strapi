/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';

const initialState = {
  formErrors: {},
  modifiedData: {
    firstname: '',
    lastname: '',
    email: '',
    roles: [],
  },
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        set(draftState.modifiedData, action.keys.split('.'), action.value);
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
