import {
  DELETE_LAYOUT,
  DELETE_LAYOUTS,
  GET_LAYOUT,
  GET_LAYOUT_SUCCEEDED,
  ON_CHANGE_LIST_LABELS,
  RESET_LIST_LABELS,
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

export function getLayout(uid, source) {
  return {
    type: GET_LAYOUT,
    uid,
    source,
  };
}

export function getLayoutSucceeded(layout, uid) {
  return {
    type: GET_LAYOUT_SUCCEEDED,
    layout,
    uid,
  };
}

export function onChangeListLabels({ target: { name, value } }) {
  return {
    type: ON_CHANGE_LIST_LABELS,
    keys: name.split('.'),
    value,
  };
}

export function resetListLabels(slug) {
  return {
    type: RESET_LIST_LABELS,
    slug,
  };
}
