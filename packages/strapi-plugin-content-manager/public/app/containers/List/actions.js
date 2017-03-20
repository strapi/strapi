/*
 *
 * List actions
 *
 */

import {
  SET_CURRENT_MODEL,
  LOAD_RECORDS,
  LOADED_RECORDS
} from './constants';

export function setCurrentModel(model) {
  return {
    type: SET_CURRENT_MODEL,
    model
  };
}

export function loadRecords() {
  return {
    type: LOAD_RECORDS,
  };
}

export function loadedRecord(records) {
  return {
    type: LOADED_RECORDS,
    records,
  };
}
