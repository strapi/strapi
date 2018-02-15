/*
 *
 * HomePage actions
 *
 */

import { ON_SEARCH } from './constants';

export function onSearch({ target }) {
  return {
    type: ON_SEARCH,
    value: target.value,
  };
}
