/*
 *
 * Admin reducer
 *
 */

import produce from 'immer';
import packageJSON from '../../../../package.json';

import {
  GET_STRAPI_LATEST_RELEASE_SUCCEEDED,
  GET_USER_PERMISSIONS,
  GET_USER_PERMISSIONS_ERROR,
  GET_USER_PERMISSIONS_SUCCEEDED,
  SET_APP_ERROR,
} from './constants';

const packageVersion = packageJSON.version;
const initialState = {
  appError: false,
  isLoading: true,
  latestStrapiReleaseTag: `v${packageVersion}`,
  shouldUpdateStrapi: false,
  userPermissions: [],
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case GET_STRAPI_LATEST_RELEASE_SUCCEEDED: {
        draftState.latestStrapiReleaseTag = action.latestStrapiReleaseTag;
        draftState.shouldUpdateStrapi = action.shouldUpdateStrapi;
        break;
      }
      case GET_USER_PERMISSIONS: {
        draftState.isLoading = true;
        break;
      }

      case GET_USER_PERMISSIONS_ERROR: {
        draftState.error = action.error;
        draftState.isLoading = false;
        break;
      }
      case GET_USER_PERMISSIONS_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.userPermissions = action.data;
        break;
      }
      case SET_APP_ERROR: {
        draftState.appError = true;
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
