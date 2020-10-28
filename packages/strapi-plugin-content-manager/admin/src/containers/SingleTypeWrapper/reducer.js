/* eslint-disable consistent-return */
import produce from 'immer';

const initialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  isCreatingEntry: true,
  isLoading: true,
  data: {},
  status: 'resolved',
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isCreatingEntry = true;
        draftState.isLoading = true;
        draftState.data = {};
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isCreatingEntry = false;
        draftState.isLoading = false;
        draftState.data = action.data;
        break;
      }
      case 'INIT_FORM': {
        draftState.isCreatingEntry = true;
        draftState.isLoading = false;
        draftState.data = state.contentTypeDataStructure;
        break;
      }
      case 'SET_DATA_STRUCTURES': {
        draftState.componentsDataStructure = action.componentsDataStructure;
        draftState.contentTypeDataStructure = action.contentTypeDataStructure;
        break;
      }
      case 'SET_STATUS': {
        draftState.status = action.status;
        break;
      }
      case 'SUBMIT_SUCCEEDED': {
        draftState.data = action.data;
        draftState.isCreatingEntry = false;

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
