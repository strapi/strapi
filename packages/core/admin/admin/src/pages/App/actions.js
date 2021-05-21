/*
 *
 * App actions
 *
 */

import { GET_DATA_SUCCEEDED } from './constants';

// eslint-disable-next-line import/prefer-default-export
export function getDataSucceeded(data) {
  return {
    type: GET_DATA_SUCCEEDED,
    data,
  };
}
