/*
 *
 * Form actions
 *
 */

 /* eslint-disable new-cap */

import { map , forEach} from 'lodash';
import { Map, List } from 'immutable';

import {
  CHANGE_INPUT,
  CONNECTIONS_FETCH,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_FETCH,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  RESET_DID_FETCH_MODEL_PROP,
  SET_FORM,
} from './constants';

import forms from './forms.json';

export function changeInput(key, value) {
  return {
    type: CHANGE_INPUT,
    key,
    value,
  };
}

export function connectionsFetch() {
  return {
    type: CONNECTIONS_FETCH,
  };
}

export function connectionsFetchSucceeded(data) {
  const connections = map(data.connections, (connection) => ({ name: connection, value: connection }))
  return {
    type: CONNECTIONS_FETCH_SUCCEEDED,
    connections,
  };
}

export function contentTypeFetch(contentTypeName) {
  return {
    type: CONTENT_TYPE_FETCH,
    contentTypeName,
  };
}

export function contentTypeFetchSucceeded(contentType) {
  const dataArray = [['attributes', List(contentType.model.attributes)]];
  forEach(contentType.model, (value, key) => {
    if (key !== 'attributes') {
      dataArray.push([key, value]);
    }
  });

  const data = Map(dataArray);
  return {
    type: CONTENT_TYPE_FETCH_SUCCEEDED,
    data,
  };
}

export function resetDidFetchModelProp() {
  return {
    type: RESET_DID_FETCH_MODEL_PROP,
  };
}

export function setForm(hash) {
  const form = forms[hash.split('::')[1]][hash.split('::')[2]];
  const data = getDataFromForm(forms[hash.split('::')[1]]);
  return {
    type: SET_FORM,
    form,
    data,
  };
}


/**
*
* @param  {object} form
* @return {object} data : An object { target: value }
*/

function getDataFromForm(form) {
  const dataArray = [['attributes', List()]];

  forEach(form, (formSection) => {
    map(formSection.items, (item) => dataArray.push([item.target, item.value]));
  });

  const data = Map(dataArray);

  return data;
}
