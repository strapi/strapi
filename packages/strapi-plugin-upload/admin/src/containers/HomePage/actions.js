/*
 *
 * HomePage actions
 *
 */

import {
  DROP_SUCCESS,
  ON_DROP,
  ON_SEARCH,
} from './constants';

export function dropSuccess(newFiles) {
  return {
    type: DROP_SUCCESS,
    newFiles,
  };
}

export function onDrop({ dataTransfer: { files } }) {
  return {
    type: ON_DROP,
    files,
  }
}

export function onSearch({ target }) {
  return {
    type: ON_SEARCH,
    value: target.value,
  };
}
