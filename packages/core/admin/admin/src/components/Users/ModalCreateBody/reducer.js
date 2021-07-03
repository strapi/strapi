/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';
import formDataModel from 'ee_else_ce/components/Users/ModalCreateBody/utils/formDataModel';

const initialState = {
  formErrors: {},
  modifiedData: formDataModel,
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
