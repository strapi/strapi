/*
 *
 * ExamplePage actions
 *
 */

import { LOAD_DATA, LOADED_DATA } from './constants';

export function loadData() {
  return {
    type: LOAD_DATA,
  };
}

export function loadedData(data) {
  return {
    type: LOADED_DATA,
    data,
  };
}
