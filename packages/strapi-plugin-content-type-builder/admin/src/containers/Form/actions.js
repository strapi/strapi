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
  CHANGE_INPUT_ATTRIBUTE,
  CONNECTIONS_FETCH,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_ACTION_SUCCEEDED,
  CONTENT_TYPE_CREATE,
  CONTENT_TYPE_EDIT,
  CONTENT_TYPE_FETCH,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  RESET_DID_FETCH_MODEL_PROP,
  RESET_IS_FORM_SET,
  SET_ATTRIBUTE_FORM,
  SET_ATTRIBUTE_FORM_EDIT,
  SET_BUTTON_LOADING,
  SET_FORM,
  UNSET_BUTTON_LOADING,
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

export function changeInputAttribute(key, value) {
  const keys = key.split('.');
  const firstKey = keys[0];
  const secondKey = keys[1];
  return {
    type: CHANGE_INPUT_ATTRIBUTE,
    firstKey,
    secondKey,
    value,
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

export function resetIsFormSet() {
  return {
    type: RESET_IS_FORM_SET,
  };
}

export function setAttributeForm(hash) {
  const data = setAttributeFormData(hash);

  return {
    type: SET_ATTRIBUTE_FORM,
    form: data.form,
    attribute: data.attribute,
  }
}

export function setAttributeFormEdit(hash, contentType) {
  const form = setAttributeFormData(hash).form;
  const contentTypeAttribute = contentType.attributes[hash.split('::')[3]];
  const attribute = Map({
    name: contentTypeAttribute.name,
    params: Map(contentTypeAttribute.params),
  });

  return {
    type: SET_ATTRIBUTE_FORM_EDIT,
    form,
    attribute,
  }
}

export function setButtonLoading() {
  return {
    type: SET_BUTTON_LOADING,
  };
}

export function unsetButtonLoading() {
  return {
    type: UNSET_BUTTON_LOADING,
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

function setAttributeFormData(hash) {
  const hashArray = hash.split('::');
  const formType = replace(hashArray[1], 'attribute', '');
  const settingsType = hashArray[2];
  const form = forms.attribute[formType][settingsType];

  const attribute = Map({
    name: '',
    params: Map({
      type: formType,
      required: false,
      maxLength: false,
      minLength: false,
    }),
  });

  return {
    form,
    attribute,
  }
}
