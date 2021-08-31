import produce from 'immer';
import { set } from 'lodash';

const initialState = {
  isLoading: true,
  isConfirmButtonLoading: false,
  initialData: {},
  modifiedData: {},
  roles: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.isConfirmButtonLoading = false;
        draftState.initialData = {};
        draftState.modifiedData = {};

        break;
      }

      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.initialData = action.data.settings;
        draftState.modifiedData = action.data.settings;
        draftState.roles = action.data.roles.map(role => ({ label: role.name, value: role.type }));

        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = true;
        break;
      }
      case 'ON_CHANGE': {
        set(draftState.modifiedData, action.keys.split('.'), action.value);
        break;
      }
      case 'ON_RESET': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'ON_SUBMIT': {
        draftState.isConfirmButtonLoading = true;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        draftState.isConfirmButtonLoading = false;
        break;
      }
      case 'ON_SUBMIT_ERROR': {
        draftState.isConfirmButtonLoading = false;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
