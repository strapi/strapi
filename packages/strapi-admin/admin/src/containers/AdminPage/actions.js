/**
 *
 * AdminPage actions
 *
 */
import {
  GET_GA_STATUS,
  GET_GA_STATUS_SUCCEEDED,
  GET_LAYOUT,
  GET_LAYOUT_SUCCEEDED,
} from './constants';

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
