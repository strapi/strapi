/*
*
* Home actions
*
*/

import { forEach } from 'lodash';
import {
  CONFIG_FETCH,
  LANGUAGES_FETCH,
  CONFIG_FETCH_SUCCEEDED,
  LANGUAGES_FETCH_SUCCEEDED,
  CHANGE_INPUT,
  CANCEL_CHANGES,
  DEFAULT_ACTION,
  EDIT_SETTINGS,
  EDIT_SETTINGS_SUCCEEDED,
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
  const data = getDataFromConfigs(configs);

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


export function languagesFetch() {
  return {
    type: LANGUAGES_FETCH,
  };
}

export function languagesFetchSucceeded(appLanguages, listLanguages) {
  const configs = {
    name: listLanguages.name,
    description: listLanguages.description,
    sections: appLanguages.languages,
  };

  return {
    type: LANGUAGES_FETCH_SUCCEEDED,
    configs,
    listLanguages,
  };
}


export function editSettings(newSettings, endPoint) {
  return {
    type: EDIT_SETTINGS,
    newSettings,
    endPoint
  };
}

export function editSettingsSucceeded(optimisticResponse) {
  const data = getDataFromConfigs(optimisticResponse);

  console.log('optimisticResponse', optimisticResponse);

  return {
    type: EDIT_SETTINGS_SUCCEEDED,
    optimisticResponse,
    data,
  };
}


function getDataFromConfigs(configs) {
  const data = {};

  forEach(configs.sections, (section) => {
    forEach(section.items, (item) => {
      data[item.target] = item.value;
    });
  });

  return data;
}
