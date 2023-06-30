/* eslint-disable consistent-return */
import produce from 'immer';

// NOTE: instead of creating a shared reducer here, we could also create a hook
// that returns the dispatch and the state, however it will mess with the linter
// and force us to either disable the linter for the hooks dependencies array rule or
// require us to add the dispatch to the array wich is not wanted. This refacto does not require us to
// to do any of this.
import {
  CLEAR_SET_MODIFIED_DATA_ONLY,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_FORM,
  RESET_PROPS,
  SET_DATA_STRUCTURES,
  SET_STATUS,
  SUBMIT_SUCCEEDED,
} from './constants';

const crudInitialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  isLoading: true,
  data: null,
  status: 'resolved',
  setModifiedDataOnly: false,
};

const crudReducer = (state = crudInitialState, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_DATA: {
        draftState.isLoading = true;
        draftState.data = null;
        break;
      }
      case GET_DATA_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.data = action.data;
        draftState.setModifiedDataOnly = action.setModifiedDataOnly ?? false;
        break;
      }
      case INIT_FORM: {
        if (action.data) {
          draftState.isLoading = false;
          draftState.data = action.data;

          break;
        }

        draftState.isLoading = false;
        draftState.data = state.contentTypeDataStructure;
        break;
      }
      case RESET_PROPS: {
        return crudInitialState;
      }
      case SET_DATA_STRUCTURES: {
        draftState.componentsDataStructure = action.componentsDataStructure;
        draftState.contentTypeDataStructure = action.contentTypeDataStructure;
        break;
      }
      case SET_STATUS: {
        draftState.status = action.status;
        break;
      }
      case SUBMIT_SUCCEEDED: {
        draftState.data = action.data;
        break;
      }
      case CLEAR_SET_MODIFIED_DATA_ONLY: {
        draftState.setModifiedDataOnly = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default crudReducer;
export { crudInitialState };
