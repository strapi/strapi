/**
 *
 * EditPage actions
 *
 */

import { get } from 'lodash';
import { getValidationsFromForm } from 'utils/formValidations';

import {
  ADD_RELATION_ITEM,
  CHANGE_DATA,
  DELETE_DATA,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_MODEL_PROPS,
  MOVE_ATTR,
  MOVE_ATTR_END,
  ON_CANCEL,
  ON_REMOVE_RELATION_ITEM,
  RESET_PROPS,
  SET_FILE_RELATIONS,
  SET_LOADER,
  SET_FORM_ERRORS,
  SUBMIT,
  SUBMIT_SUCCESS,
  UNSET_LOADER,
} from './constants';

export function addRelationItem({ key, value }) {
  return {
    type: ADD_RELATION_ITEM,
    key,
    value,
  };
}

export function changeData({ target }) {
  return {
    type: CHANGE_DATA,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function deleteData() {
  return {
    type: DELETE_DATA,
  };
}

export function getData(id, source, mainField) {
  return {
    type: GET_DATA,
    id,
    source,
    mainField,
  };
}

export function getDataSucceeded(id, data, pluginHeaderTitle) {
  return {
    type: GET_DATA_SUCCEEDED,
    id,
    data,
    pluginHeaderTitle,
  };
}

export function initModelProps(modelName, isCreating, source, attributes, displayedAttributes) {
  const formValidations = getValidationsFromForm(
    Object.keys(attributes).map(attr => ({ name: attr, validations: get(attributes, attr, {}) })),
    [],
  ).filter(field => {
    if (get(field, ['validations', 'required'], false) === true) {
      return displayedAttributes.indexOf(field.name) !== -1;
    }

    return true;
  });

  const record = Object.keys(attributes).reduce((acc, current) => {
    if (attributes[current].default) {
      acc[current] = attributes[current].default;
    } else if (attributes[current].type === 'json') {
      acc[current] = {};
    }

    return acc;
  }, {});

  return {
    type: INIT_MODEL_PROPS,
    formValidations,
    isCreating,
    modelName,
    record,
    source,
  };
}

export function moveAttr(dragIndex, hoverIndex, keys) {
  return {
    type: MOVE_ATTR,
    dragIndex,
    hoverIndex,
    keys,
  };
}

export function moveAttrEnd() {
  return {
    type: MOVE_ATTR_END,
  };
}

export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function onRemoveRelationItem({ key, index }) {
  return {
    type: ON_REMOVE_RELATION_ITEM,
    key,
    index,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function setFileRelations(fileRelations) {
  return {
    type: SET_FILE_RELATIONS,
    fileRelations,
  };
}

export function setFormErrors(formErrors) {
  return {
    type: SET_FORM_ERRORS,
    formErrors,
  };
}

export function setLoader() {
  return {
    type: SET_LOADER,
  };
}

export function submit(context) {
  return {
    type: SUBMIT,
    context,
  };
}

export function submitSuccess() {
  return {
    type: SUBMIT_SUCCESS,
  };
}

export function unsetLoader() {
  return {
    type: UNSET_LOADER,
  };
}
