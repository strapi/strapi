/*
 *
 * ModelPage actions
 *
 */
import { cloneDeep, findIndex, forEach, get, includes, map, set } from 'lodash';
import { storeData } from '../../utils/storeData';

import {
  ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  CHECK_IF_TABLE_EXISTS,
  CHECK_IF_TABLE_EXISTS_SUCCEEDED,
  EDIT_CONTENT_TYPE_ATTRIBUTE,
  EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION,
  DEFAULT_ACTION,
  DELETE_ATTRIBUTE,
  MODEL_FETCH,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  SET_BUTTON_LOADER,
  SUBMIT,
  SUBMIT_ACTION_SUCCEEDED,
  RESET_SHOW_BUTTONS_PROPS,
  UNSET_BUTTON_LOADER,
  UPDATE_CONTENT_TYPE,
} from './constants';

export function addAttributeRelationToContentType(newAttribute) {
  return {
    type: ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE,
    newAttribute,
    parallelAttribute: setParallelAttribute(newAttribute),
  };
}

export function addAttributeToContentType(newAttribute) {
  return {
    type: ADD_ATTRIBUTE_TO_CONTENT_TYPE,
    newAttribute,
  };
}

export function cancelChanges() {
  return {
    type: CANCEL_CHANGES,
  };
}

export function checkIfTableExists() {
  return {
    type: CHECK_IF_TABLE_EXISTS,
  };
}

export function checkIfTableExistsSucceeded({ tableExists }) {
  return {
    type: CHECK_IF_TABLE_EXISTS_SUCCEEDED,
    tableExists,
  };
}

export function editContentTypeAttribute(modifiedAttribute, attributePosition, shouldAddParralAttribute) {
  return {
    type: EDIT_CONTENT_TYPE_ATTRIBUTE,
    modifiedAttribute,
    attributePosition,
    shouldAddParralAttribute,
    parallelAttribute: setParallelAttribute(modifiedAttribute),
  };
}

export function editContentTypeAttributeRelation(modifiedAttribute, attributePosition, parallelAttributePosition, shouldRemoveParallelAttribute) {
  return {
    type: EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION,
    modifiedAttribute,
    attributePosition,
    parallelAttribute: setParallelAttribute(modifiedAttribute),
    parallelAttributePosition,
    shouldRemoveParallelAttribute,
  };
}

export function deleteAttribute(position, modelName, shouldRemoveParallelAttribute) {
  const temporaryContentType = storeData.getContentType();

  if (get(temporaryContentType, 'name') === modelName) {
    const attributeKey = temporaryContentType.attributes[position].params.key;
    temporaryContentType.attributes.splice(position, 1);

    if (shouldRemoveParallelAttribute) {
      temporaryContentType.attributes.splice(findIndex(temporaryContentType.attributes, ['name', attributeKey]), 1);
    }

    const updatedContentType = temporaryContentType;
    storeData.setContentType(updatedContentType);
  }

  return {
    type: DELETE_ATTRIBUTE,
    position,
    modelName,
    shouldRemoveParallelAttribute,
  };
}

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  };
}

export function modelFetch(modelName) {
  return {
    type: MODEL_FETCH,
    modelName,
  };
}

export function modelFetchSucceeded(data) {
  const model = data;
  const defaultKeys = ['required', 'unique', 'type', 'key', 'target', 'nature', 'targetColumnName', 'columnName'];

  forEach(model.model.attributes, (attribute, index) => {
    map(attribute.params, (value, key) => {
      if (!includes(defaultKeys, key) && value) {
        set(model.model.attributes[index].params, `${key}Value`, value);
        set(model.model.attributes[index].params, key, true);
      }
    });
  });

  return {
    type: MODEL_FETCH_SUCCEEDED,
    model,
  };
}

export function postContentTypeSucceeded() {
  return {
    type: POST_CONTENT_TYPE_SUCCEEDED,
  };
}

export function resetShowButtonsProps() {
  return {
    type: RESET_SHOW_BUTTONS_PROPS,
  };
}

export function setButtonLoader() {
  return {
    type: SET_BUTTON_LOADER,
  };
}

export function submit(context, modelName) {
  return {
    type: SUBMIT,
    context,
    modelName,
  };
}

export function submitActionSucceeded() {
  return {
    type: SUBMIT_ACTION_SUCCEEDED,
  };
}

export function unsetButtonLoader() {
  return {
    type: UNSET_BUTTON_LOADER,
  };
}

export function updateContentType(data) {
  return {
    type: UPDATE_CONTENT_TYPE,
    data,
  };
}



function setParallelAttribute(data) {
  const parallelAttribute = cloneDeep(data);

  parallelAttribute.params.key = data.name;
  parallelAttribute.name = data.params.key;
  parallelAttribute.params.columnName = data.params.targetColumnName;
  parallelAttribute.params.targetColumnName = data.params.columnName;
  parallelAttribute.params.dominant = false;

  return parallelAttribute;
}
