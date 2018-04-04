/*
*
* Form actions
*
*/

/* eslint-disable new-cap */

import { concat, includes, map, forEach, replace } from 'lodash';
import { Map, List, fromJS } from 'immutable';
import { getValidationsFromForm } from '../../utils/formValidations';
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
  REMOVE_CONTENT_TYPE_REQUIRED_ERROR,
  RESET_DID_FETCH_MODEL_PROP,
  RESET_FORM_ERRORS,
  RESET_IS_FORM_SET,
  SET_ATTRIBUTE_FORM,
  SET_ATTRIBUTE_FORM_EDIT,
  SET_BUTTON_LOADING,
  SET_FORM,
  SET_FORM_ERRORS,
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
  return {
    type: CHANGE_INPUT_ATTRIBUTE,
    keys: ['modifiedDataAttribute'].concat(key.split('.')),
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
  const shouldSetUpdatedContentTypeProp = storeData.getIsModelTemporary() || false;
  storeData.setContentType(newModel);

  return {
    type: CONTENT_TYPE_CREATE,
    shouldSetUpdatedContentTypeProp,
  };
}

export function contentTypeEdit(context) {
  return {
    type: CONTENT_TYPE_EDIT,
    context,
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

export function removeContentTypeRequiredError() {
  return {
    type: REMOVE_CONTENT_TYPE_REQUIRED_ERROR,
  };
}

export function resetDidFetchModelProp() {
  return {
    type: RESET_DID_FETCH_MODEL_PROP,
  };
}

export function resetFormErrors() {
  return {
    type: RESET_FORM_ERRORS,
  };
}

export function resetIsFormSet() {
  return {
    type: RESET_IS_FORM_SET,
  };
}

export function setAttributeForm(hash) {
  const data = setAttributeFormData(hash);
  const attributeRelation = Map({
    name: '',
    params: Map({
      columnName: '',
      target: '',
      targetColumnName: "",
      key: '',
      nature: 'oneToOne',
      required: false,
      unique: false,
      dominant: false,
    }),
  });
  const attribute = includes(hash, 'attributerelation') ? attributeRelation : data.attribute;
  const formValidations = concat(getValidationsFromForm(data.form, []), { name: 'name', validations: { required: true } });

  return {
    type: SET_ATTRIBUTE_FORM,
    form: data.form,
    attribute,
    formValidations,
  };
}

export function setAttributeFormEdit(hash, contentType) {
  const form = setAttributeFormData(hash).form;
  const contentTypeAttribute = contentType.attributes[hash.split('::')[3]];
  const formValidations = getValidationsFromForm(form, []);

  const attribute = Map({
    name: contentTypeAttribute.name,
    params: fromJS(contentTypeAttribute.params),
  });

  return {
    type: SET_ATTRIBUTE_FORM_EDIT,
    form,
    attribute,
    formValidations,
  };
}

export function setButtonLoading() {
  return {
    type: SET_BUTTON_LOADING,
  };
}

export function setForm(hash) {
  const form = forms[hash.split('::')[1]][hash.split('::')[2]];
  const data = getDataFromForm(forms[hash.split('::')[1]]);
  const formValidations = getValidationsFromForm(forms[hash.split('::')[1]], []);

  return {
    type: SET_FORM,
    form,
    data,
    formValidations,
  };
}


export function setFormErrors(formErrors) {
  return {
    type: SET_FORM_ERRORS,
    formErrors,
  };
}

export function unsetButtonLoading() {
  return {
    type: UNSET_BUTTON_LOADING,
  };
}

/**
*
* @param  {object} form
* @return {object} data : An object { name: value }
*/

function getDataFromForm(form) {
  const dataArray = [['attributes', List()]];

  forEach(form, (formSection) => {
    map(formSection.items, (item) => dataArray.push([item.name, item.value]));
  });

  const data = Map(dataArray);

  return data;
}

function setAttributeFormData(hash) {
  const hashArray = hash.split('::');
  const formType = replace(hashArray[1], 'attribute', '');
  const settingsType = hashArray[2];
  const form = forms.attribute[formType][settingsType];
  const type = formType === 'number' ? 'integer' : formType;
  let defaultValue = type === 'number' ? 0 : '';

  if (type === 'checkbox') {
    defaultValue = false;
  }

  const attribute = Map({
    name: '',
    params: Map({
      appearance: Map({
        WYSIWYG: false,
      }),
      type,
      default: defaultValue,
      required: false,
      unique: false,
      maxLength: false,
      minLength: false,
      multiple: false,
      min: false,
      max: false,
    }),
  });

  return {
    form,
    attribute,
  };
}
