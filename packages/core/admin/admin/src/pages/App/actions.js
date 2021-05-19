/*
 *
 * LanguageProvider actions
 *
 */

import { GET_INFOS_DATA_SUCCEEDED, GET_DATA_SUCCEEDED } from './constants';

export function getInfosDataSucceeded(data) {
  return {
    type: GET_INFOS_DATA_SUCCEEDED,
    data,
  };
}

export function getDataSucceeded(data) {
  return {
    type: GET_DATA_SUCCEEDED,
    data,
  };
}
