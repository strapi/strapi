/**
 *
 * main reducer
 */
/* eslint-disable consistent-return */
import produce from 'immer';
import { GET_INIT_DATA, RESET_INIT_DATA, SET_INIT_DATA } from './constants';

const initialState = {
  components: [],
  status: 'loading',
  models: [],
  collectionTypeLinks: [],
  singleTypeLinks: [],
};

/**
 * Known as content-manager_app in the redux store
 */
const mainReducer = (state = initialState, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_INIT_DATA: {
        draftState.status = 'loading';
        break;
      }
      case RESET_INIT_DATA: {
        return initialState;
      }
      case SET_INIT_DATA: {
        draftState.collectionTypeLinks = action.data.authorizedCollectionTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.singleTypeLinks = action.data.authorizedSingleTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.components = action.data.components;
        draftState.models = action.data.contentTypeSchemas;
        draftState.fieldSizes = action.data.fieldSizes;
        draftState.status = 'resolved';
        break;
      }
      default:
        return draftState;
    }
  });

export default mainReducer;
export { initialState };
