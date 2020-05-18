/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  roles: [],
  selectedRoles: [],
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.roles = action.data;
        break;
      }
      case 'ON_SELECTION': {
        const { id } = action;
        const roleIndex = state.selectedRoles.findIndex(roleId => roleId === id);

        if (roleIndex === -1) {
          draftState.selectedRoles = [...state.selectedRoles, id];
        } else {
          draftState.selectedRoles = state.selectedRoles.filter(roleId => roleId !== id);
        }
        break;
      }
      // case 'ON_REMOVE_ROLE': {
      //   const { id } = action;
      //   draftState.roles = state.roles.filter(role => role.id !== id);
      //   break;
      // }
      // case 'ON_REMOVE_ROLES': {
      //   const comparator = (first, second) => first.id === second;
      //   draftState.roles = differenceWith(state.roles, state.selectedRoles, comparator);
      //   break;
      // }
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
