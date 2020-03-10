import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('data', () => action.data);
    case 'ON_CHANGE_DATA_TO_DELETE': {
      const { value, id } = action;

      if (value) {
        return state.update('dataToDelete', dataToDelete => {
          return dataToDelete.push(id);
        });
      }
      const index = state.get('dataToDelete').findIndex(item => item === id);

      return state.removeIn(['dataToDelete', index]);
    }
    case 'TOGGLE_SELECT_ALL': {
      const { value } = action;

      if (!value) {
        return state.update('dataToDelete', () => []);
      }

      return state.update('dataToDelete', () => state.get('data').map(item => item.get('id')));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
