import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataCount: 0,
  dataToDelete: [],
  isLoading: true,
  searchParams: {
    _limit: 10,
    _start: 0,
    _q: '',
    filters: [],
  },
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'CLEAR_DATA_TO_DELETE':
      return state.update('dataToDelete', () => fromJS([]));
    case 'GET_DATA':
      return state.update('isLoading', () => true);
    case 'GET_DATA_ERROR':
      return state.update('isLoading', () => false);
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('data', () => fromJS(action.data))
        .update('dataCount', () => action.count)
        .update('isLoading', () => false);
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
    case 'SET_PARAM': {
      const { name, value } = action;

      return state.updateIn(['searchParams', name], () => value);
    }
    case 'SET_PARAMS': {
      const { params } = action;

      return state.update('searchParams', searchParams => {
        return searchParams.mergeDeep(params);
      });
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
    case 'ON_DELETE_MEDIA_SUCCEEDED':
      return state
        .update('data', list => list.filter(item => item.get('id') !== action.mediaId))
        .update('dataCount', count => count - 1);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
