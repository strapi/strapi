/* eslint-disable consistent-return */
import produce from 'immer';

const initialState = {
  data: [],
  dataToDelete: [],
  isLoading: true,
  pagination: {
    page: 1,
    pageSize: 10,
    pageCount: 0,
    total: 0,
  },
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        return initialState;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.data = action.data;
        draftState.isLoading = false;
        draftState.pagination = action.pagination;
        break;
      }
      case 'ON_CHANGE_DATA_TO_DELETE': {
        draftState.dataToDelete = action.dataToDelete;
        break;
      }
      case 'ON_DELETE_USERS': {
        draftState.showModalConfirmButtonLoading = true;
        break;
      }
      case 'ON_DELETE_USERS_SUCCEEDED': {
        draftState.shouldRefetchData = true;
        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.shouldRefetchData = false;
        draftState.dataToDelete = [];
        draftState.showModalConfirmButtonLoading = false;
        break;
      }
      case 'UNSET_IS_LOADING': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
