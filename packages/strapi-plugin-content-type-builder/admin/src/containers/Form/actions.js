/*
 *
 * Form actions
 *
 */

 /* eslint-disable new-cap */

import { map , forEach, replace } from 'lodash';
import { Map, List } from 'immutable';
import { storeData } from '../../utils/storeData';

import {
  CHANGE_INPUT,
  CONNECTIONS_FETCH,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_ACTION_SUCCEEDED,
  CONTENT_TYPE_CREATE,
  CONTENT_TYPE_EDIT,
  CONTENT_TYPE_FETCH,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  RESET_DID_FETCH_MODEL_PROP,
  SET_ATTRIBUTE_FORM,
  SET_FORM,
} from './constants';

import forms from './forms.json';

export function changeInput(key, value, isEditing) {
  const objectToModify = isEditing ? 'modifiedDataEdit' : 'modifiedData';
  return {
    type: CHANGE_INPUT,
    key,
    value,
    objectToModify,
  };
}

export function connectionsFetch() {
  return {
    type: CONNECTIONS_FETCH,
  };
}

export function connectionsFetchSucceeded(data) {
  const connections = map(data.connections, (connection) => ({ name: connection, value: connection }));
  return {
    type: CONNECTIONS_FETCH_SUCCEEDED,
    connections,
  };
}

export function contentTypeActionSucceeded() {
  return {
    type: CONTENT_TYPE_ACTION_SUCCEEDED,
  };
}

export function contentTypeCreate(newModel) {
  storeData.setContentType(newModel);

  return {
    type: CONTENT_TYPE_CREATE,
  };
}

export function contentTypeFetch(contentTypeName) {
  return {
    type: CONTENT_TYPE_FETCH,
    contentTypeName,
  };
}

export function contentTypeFetchSucceeded(contentType) {
  // TODO remove forced connection
  const dataArray = [['attributes', List(contentType.model.attributes)], ['connection', 'default']];
  // const dataArray = [['attributes', List(contentType.model.attributes)]];
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

export function contentTypeEdit() {
  return {
    type: CONTENT_TYPE_EDIT,
  };
}

export function resetDidFetchModelProp() {
  return {
    type: RESET_DID_FETCH_MODEL_PROP,
  };
}

export function setAttributeForm(hash) {
  const form = forms.attribute[replace(hash.split('::')[1], 'attribute', '')][hash.split('::')[2]];
  
  return {
    type: SET_ATTRIBUTE_FORM,
    form,
  }
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
