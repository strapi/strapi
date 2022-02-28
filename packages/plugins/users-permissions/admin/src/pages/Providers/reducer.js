import produce from 'immer';
import { set } from 'lodash';

const initialState = {
  formErrors: {},
  isLoading: true,
  initialData: {},
  modifiedData: {},
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
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
      case 'GET_DATA_ERROR': {
        draftState.isLoading = true;
        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case 'RESET_FORM': {
        draftState.modifiedData = state.initialData;
        draftState.formErrors = {};
        break;
      }
      case 'SET_ERRORS': {
        draftState.formErrors = action.errors;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
