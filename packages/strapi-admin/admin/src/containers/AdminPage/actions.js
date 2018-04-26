/**
 *
 * AdminPage actions
 *
 */
import {
  GET_CURR_ENV_SUCCEEDED,
  GET_GA_STATUS,
  GET_GA_STATUS_SUCCEEDED,
  GET_LAYOUT,
  GET_LAYOUT_SUCCEEDED,
  GET_STRAPI_VERSION_SUCCEEDED,
} from './constants';

export function getCurrEnvSucceeded(currentEnvironment) {
  return {
    type: GET_CURR_ENV_SUCCEEDED,
    currentEnvironment,
  };
}

export function getGaStatus() {
  return {
    type: GET_GA_STATUS,
  };
}

export function getGaStatusSucceeded(allowGa) {
  return {
    type: GET_GA_STATUS_SUCCEEDED,
    allowGa,
  };
}

export function getLayout() {
  return {
    type: GET_LAYOUT,
  };
}

export function getLayoutSucceeded(layout) {
  return {
    type: GET_LAYOUT_SUCCEEDED,
    layout,
  };
}

export function getStrapiVersionSucceeded(strapiVersion) {
  return {
    type: GET_STRAPI_VERSION_SUCCEEDED,
    strapiVersion,
  };
}
