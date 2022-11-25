/**
 *
 * main reducer
 */
/* eslint-disable consistent-return */
import produce from 'immer';
import { GET_DATA, RESET_PROPS, SET_CONTENT_TYPE_LINKS } from './constants';

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
      case GET_DATA: {
        draftState.status = 'loading';
        break;
      }
      case RESET_PROPS: {
        return initialState;
      }
      case SET_CONTENT_TYPE_LINKS: {
        draftState.collectionTypeLinks = action.data.authorizedCtLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.singleTypeLinks = action.data.authorizedStLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.components = action.data.components;
        draftState.models = action.data.contentTypeSchemas;
        draftState.status = 'resolved';
        break;
      }
      default:
        return draftState;
    }
  });

export default mainReducer;
export { initialState };
