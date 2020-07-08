/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  selectedRoles: [],
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_SELECTION': {
        const { id } = action;
        const roleIndex = state.selectedRoles.findIndex(roleId => roleId === id);

        if (roleIndex === -1) {
          draftState.selectedRoles.push(id);
        } else {
          draftState.selectedRoles = state.selectedRoles.filter(roleId => roleId !== id);
        }
        break;
      }
      case 'ON_REMOVE_ROLES': {
        draftState.showModalConfirmButtonLoading = true;
        break;
      }
      case 'ON_REMOVE_ROLES_SUCCEEDED': {
        draftState.shouldRefetchData = true;
        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.shouldRefetchData = false;
        draftState.selectedRoles = [];
        draftState.showModalConfirmButtonLoading = false;
        break;
      }
      case 'SET_ROLE_TO_DELETE': {
        draftState.selectedRoles = [action.id];

        break;
      }
      // Leaving this code for the moment
      // case 'ON_DUPLICATION': {
      //   const { id } = action;
      //   draftState.roles = state.roles.reduce((acc, c) => {
      //     if (c.id === id) {
      //       return acc.concat([c, { ...c, id: state.roles.length + 1 }]);
      //     }

      //     return [...acc, c];
      //   }, []);
      //   break;
      // }
      default:
        return draftState;
    }
  });

export default reducer;
