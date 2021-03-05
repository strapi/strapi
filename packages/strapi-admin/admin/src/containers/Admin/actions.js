/*
 *
 * Admin actions
 *
 */

import { GET_STRAPI_LATEST_RELEASE_SUCCEEDED, SET_APP_ERROR } from './constants';

export function getStrapiLatestReleaseSucceeded(latestStrapiReleaseTag, shouldUpdateStrapi) {
  return {
    type: GET_STRAPI_LATEST_RELEASE_SUCCEEDED,
    latestStrapiReleaseTag,
    shouldUpdateStrapi,
  };
}

export function setAppError() {
  return {
    type: SET_APP_ERROR,
  };
}
