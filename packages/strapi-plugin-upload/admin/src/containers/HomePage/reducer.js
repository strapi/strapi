import { fromJS } from 'immutable';

const initialState = fromJS({
  data: [],
  dataCount: 0,
  dataToDelete: [],
  isLoading: true,
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
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
      const { id } = action;
      const isSelected = state
        .get('dataToDelete')
        .find(item => item.get('id').toString() === id.toString());

      if (!isSelected) {
        const item = state.get('data').find(item => item.get('id').toString() === id.toString());

        return state.update('dataToDelete', dataToDelete => {
          return dataToDelete.push(item);
        });
      }

      const index = state
        .get('dataToDelete')
        .findIndex(item => item.get('id').toString() === id.toString());

      return state.removeIn(['dataToDelete', index]);
    }
    case 'ON_DELETE_MEDIAS': {
      return state.update('showModalConfirmButtonLoading', () => true);
    }
    case 'ON_DELETE_MEDIAS_SUCCEEDED': {
      return state
        .update('dataToDelete', () => fromJS([]))
        .update('shouldRefetchData', () => true)
        .update('showModalConfirmButtonLoading', () => false);
    }
    case 'ON_DELETE_MEDIAS_ERROR': {
      return state
        .update('dataToDelete', () => fromJS([]))
        .update('showModalConfirmButtonLoading', () => false);
    }
    case 'RESET_DATA_TO_DELETE': {
      return state
        .update('dataToDelete', () => fromJS([]))
        .update('shouldRefetchData', () => false)
        .update('showModalConfirmButtonLoading', () => false);
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
