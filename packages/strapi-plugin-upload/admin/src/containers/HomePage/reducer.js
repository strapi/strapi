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
      return state
        .update('data', () => fromJS(action.data))
        .update('dataCount', () => action.count);
    case 'ON_CHANGE_DATA_TO_DELETE': {
      const { value, id } = action;

      if (value) {
        const item = state.get('data').find(item => item.get('id') === id);

        return state.update('dataToDelete', dataToDelete => {
          return dataToDelete.push(item);
        });
      }

      const index = state.get('dataToDelete').findIndex(item => item.get('id') === id);

      return state.removeIn(['dataToDelete', index]);
    }
    case 'TOGGLE_SELECT_ALL': {
      const isSelected = state.get('data').every(item => state.get('dataToDelete').includes(item));

      if (isSelected) {
        return state.update('dataToDelete', dataToDelete =>
          dataToDelete.filter(item => !state.get('data').includes(item))
        );
      }

      return state.update('dataToDelete', dataToDelete => {
        const newItems = state.get('data').filter(item => {
          return !state.get('dataToDelete').includes(item);
        });

        return dataToDelete.concat(newItems);
      });
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
