/*
 *
 * Single actions
 *
 */

import {
  SET_CURRENT_MODEL,
  LOAD_RECORD,
  LOADED_RECORD
} from './constants';

export function setCurrentModel(model) {
  return {
    type: SET_CURRENT_MODEL,
    model
  };
}

export function loadRecord(id) {
  return {
    type: LOAD_RECORD,
    id,
  };
}

export function loadedRecord(record) {
  return {
    type: LOADED_RECORD,
    record,
  };
}
