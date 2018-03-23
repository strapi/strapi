/**
 *
 * AdminPage actions
 *
 */
import { GET_GA_STATUS, GET_GA_STATUS_SUCCEEDED } from './constants';

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
