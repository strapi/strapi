/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  // TODO : TEMP => Remove after role creation is done.
  roles: [
    {
      id: 1,
      name: 'Super admin',
      description: 'This is the fake description of the super admin role.',
      users: [1],
    },
    {
      id: 2,
      name: 'Editor',
      description:
        'This is the fake description of the editor role. This is the fake description of the editor role.',
      users: [7, 2, 3, 4],
    },
    {
      id: 3,
      name: 'Author',
      users: [5, 34],
    },
  ],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        draftState.roles = action.data;
        draftState.isLoading = false;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
