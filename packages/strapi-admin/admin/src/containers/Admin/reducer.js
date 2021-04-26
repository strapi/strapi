/*
 *
 * Admin reducer
 *
 */

import produce from 'immer';
import packageJSON from '../../../../package.json';

import { GET_STRAPI_LATEST_RELEASE_SUCCEEDED, SET_APP_ERROR } from './constants';

const packageVersion = packageJSON.version;
const initialState = {
  appError: false,
  latestStrapiReleaseTag: `v${packageVersion}`,
  shouldUpdateStrapi: false,
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
