/*
 *
 * Single actions
 *
 */

import {
  LOAD_RECORD,
  LOADED_RECORD
} from './constants';

export function loadRecord(model, id) {
  return {
    type: LOAD_RECORD,
    model,
    id
  };
}

export function loadedRecord(record) {
  return {
    type: LOADED_RECORD,
    record
  };
}
