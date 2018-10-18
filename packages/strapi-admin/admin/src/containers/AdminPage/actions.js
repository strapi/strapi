/**
 *
 * AdminPage actions
 *
 */
import {
  GET_ADMIN_DATA,
  GET_ADMIN_DATA_SUCCEEDED,
} from './constants';

export function getAdminData() {
  return {
    type: GET_ADMIN_DATA,
  };
}

export function getAdminDataSucceeded(data) {
  return {
    type: GET_ADMIN_DATA_SUCCEEDED,
    data,
  };
}