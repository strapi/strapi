import {
  DELETE_LAYOUT,
  DELETE_LAYOUTS,
  GET_LAYOUT,
  GET_LAYOUT_SUCCEEDED,
} from './constants';

export function deleteLayout(uid) {
  return {
    type: DELETE_LAYOUT,
    uid,
  };
}

export function deleteLayouts() {
  return {
    type: DELETE_LAYOUTS,
  };
}

export function getLayout(uid) {
  return {
    type: GET_LAYOUT,
    uid,
  };
}

export function getLayoutSucceeded(layout, uid) {
  return {
    type: GET_LAYOUT_SUCCEEDED,
    layout,
    uid,
  };
}
