/* eslint-disable consistent-return */
import produce from 'immer';

// NOTE: instead of creating a shared reducer here, we could also create a hook
// that returns the dispatch and the state, however it will mess with the linter
// and force us to either disable the linter for the hooks dependencies array rule or
// require us to add the dispatch to the array wich is not wanted. This refacto does not require us to
// to do any of this.

const crudInitialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  isLoading: true,
  data: {},
  status: 'resolved',
};

const crudReducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.data = {};
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.data = action.data;
        break;
      }
      case 'INIT_FORM': {
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
        break;
      }
      default:
        return draftState;
    }
  });

export default crudReducer;
export { crudInitialState };
