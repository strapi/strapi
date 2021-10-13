import {
  GET_USER_PERMISSIONS,
  GET_USER_PERMISSIONS_SUCCEEDED,
  GET_USER_PERMISSIONS_ERROR,
} from './constants';

export function getUserPermissions() {
  return {
    type: GET_USER_PERMISSIONS,
  };
}

export function getUserPermissionsError(error) {
  return {
    type: GET_USER_PERMISSIONS_ERROR,
    error,
  };
}

export function getUserPermissionsSucceeded(data) {
  return {
    type: GET_USER_PERMISSIONS_SUCCEEDED,
    data,
  };
}
