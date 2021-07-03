import produce from 'immer';

const initialState = {
  data: [],
  dataCount: 0,
  dataToDelete: [],
  isLoading: true,
  showModalConfirmButtonLoading: false,
  shouldRefetchData: false,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'CLEAR_DATA_TO_DELETE': {
        draftState.dataToDelete = [];
        break;
      }
      case 'GET_DATA': {
        draftState.isLoading = true;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.data = action.data;
        draftState.dataCount = action.count;
        draftState.isLoading = false;
        break;
      }
      case 'ON_CHANGE_DATA_TO_DELETE': {
        const id = action.id.toString();
        const index = state.dataToDelete.findIndex(item => item.id.toString() === id);
        const isSelected = index !== -1;

        if (!isSelected) {
          const item = state.data.find(item => item.id.toString() === id);

          draftState.dataToDelete.push(item);

          break;
        }

        draftState.dataToDelete.splice(index, 1);

        break;
      }
      case 'ON_DELETE_MEDIAS': {
        draftState.showModalConfirmButtonLoading = true;
        break;
      }
      case 'ON_DELETE_MEDIAS_SUCCEEDED': {
        draftState.dataToDelete = [];
        draftState.shouldRefetchData = true;
        draftState.showModalConfirmButtonLoading = false;

        break;
      }
      case 'ON_DELETE_MEDIAS_ERROR': {
        draftState.dataToDelete = [];
        draftState.showModalConfirmButtonLoading = false;

        break;
      }
      case 'RESET_DATA_TO_DELETE': {
        draftState.dataToDelete = [];
        draftState.shouldRefetchData = false;
        draftState.showModalConfirmButtonLoading = false;
        break;
      }
      case 'TOGGLE_SELECT_ALL': {
        const isSelected = state.data.every(
          item => state.dataToDelete.find(data => data.id === item.id) !== undefined
        );

        if (isSelected) {
          draftState.dataToDelete = state.dataToDelete.filter(item => {
            return state.data.findIndex(data => data.id === item.id) === -1;
          });
          break;
        }

        const newItems = state.data.filter(item => !state.dataToDelete.includes(item));

        draftState.dataToDelete = [...state.dataToDelete, ...newItems];

        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
