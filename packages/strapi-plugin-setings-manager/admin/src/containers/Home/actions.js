/*
*
* Home actions
*
*/

import { forEach } from 'lodash';
import {
  CONFIG_FETCH,
  CONFIG_FETCH_SUCCEEDED,
  CHANGE_INPUT,
  CANCEL_CHANGES,
  SUBMIT_CHANGES,
  DEFAULT_ACTION,
} from './constants';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  }
}

export function configFetch(endPoint) {
  return {
    type: CONFIG_FETCH,
    endPoint,
  };
}

export function configFetchSucceded(configs) {
  const data = {};
  forEach(configs.sections, (section) => {
    forEach(section.items, (item) => {
      data[item.target] = item.value;
    });
  });

  return {
    type: CONFIG_FETCH_SUCCEEDED,
    configs,
    data,
  };
}

export function changeInput(key, value) {
  return {
    type: CHANGE_INPUT,
    key,
    value,
  };
}

export function cancelChanges() {
  return {
    type: CANCEL_CHANGES,
  };
}

export function submitChanges() {
  console.log('ok');
  return {
    type: SUBMIT_CHANGES,
  };
}
