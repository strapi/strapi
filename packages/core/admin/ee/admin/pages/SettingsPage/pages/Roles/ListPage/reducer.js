/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  roleToDelete: null,
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
};

const reducer = (state, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_REMOVE_ROLES': {
        draftState.showModalConfirmButtonLoading = true;
        break;
      }
      case 'ON_REMOVE_ROLES_SUCCEEDED': {
        draftState.shouldRefetchData = true;
        draftState.roleToDelete = null;
        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.shouldRefetchData = false;
        draftState.roleToDelete = null;
        draftState.showModalConfirmButtonLoading = false;
        break;
      }
      case 'SET_ROLE_TO_DELETE': {
        draftState.roleToDelete = action.id;

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
