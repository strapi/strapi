import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataCount: 0,
  dataToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'CLEAR_DATA_TO_DELETE':
      return state.update('dataToDelete', () => fromJS([]));
    case 'GET_DATA_SUCCEEDED':
      return state.update('data', () => fromJS(action.data));
    case 'GET_DATA_COUNT_SUCCEEDED':
      return state.update('dataCount', () => fromJS(action.count));
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
      const isSelected = state.get('data').size === state.get('dataToDelete').size;

      if (isSelected) {
        return state.update('dataToDelete', () => fromJS([]));
      }

      return state.update('dataToDelete', () => state.get('data').map(item => item.get('id')));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
