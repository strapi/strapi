/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  // TODO : TEMP => Remove after role creation is done.
  roles: [
    {
      id: 1,
      name: 'Super admin',
      description: 'This is the fake description of the super admin role.',
      usersCounts: 3,
    },
    {
      id: 2,
      name: 'Editor',
      description:
        'This is the fake description of the editor role. This is the fake description of the editor role.',
      usersCounts: 1,
    },
    {
      id: 3,
      name: 'Author',
      usersCounts: 0,
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
