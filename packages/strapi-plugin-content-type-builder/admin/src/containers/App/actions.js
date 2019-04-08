/*
 *
 * App actions
 *
 */
import { cloneDeep, pick, set, camelCase } from 'lodash';
import { fromJS, OrderedMap } from 'immutable';
import {
  ADD_ATTRIBUTE_RELATION,
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL,
  DELETE_MODEL_ATTRIBUTE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_MODEL,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  ON_CHANGE_RELATION,
  ON_CHANGE_RELATION_NATURE,
  ON_CHANGE_RELATION_TARGET,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  SAVE_EDITED_ATTRIBUTE,
  SAVE_EDITED_ATTRIBUTE_RELATION,
  SET_TEMPORARY_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE_RELATION,
  SUBMIT_CONTENT_TYPE,
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
} from './constants';

export function addAttributeRelation(isModelTemporary, modelName) {
  return {
    type: ADD_ATTRIBUTE_RELATION,
    isModelTemporary,
    modelName,
  };
}

export function addAttributeToExistingContentType(contentTypeName, attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
    attributeType,
    contentTypeName,
  };
}

export function addAttributeToTempContentType(attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
    attributeType,
  };
}

export function cancelNewContentType() {
  return {
    type: CANCEL_NEW_CONTENT_TYPE,
  };
}

export function clearTemporaryAttribute() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE,
  };
}

export function clearTemporaryAttributeRelation() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  };
}

export function createTempContentType() {
  return {
    type: CREATE_TEMP_CONTENT_TYPE,
  };
}

export function deleteModel(modelName, context) {
  return {
    type: DELETE_MODEL,
    modelName,
    context,
  };
}

export function deleteModelAttribute(keys) {
  return {
    type: DELETE_MODEL_ATTRIBUTE,
    keys,
  };
}

export function deleteModelSucceeded(modelName) {
  return {
    type: DELETE_MODEL_SUCCEEDED,
    modelName,
  };
}

export function deleteTemporaryModel() {
  return {
    type: DELETE_TEMPORARY_MODEL,
  };
}

export function getData() {
  return {
    type: GET_DATA,
  };
}

export function getDataSucceeded({ allModels, models }, connections) {
  const initialData = allModels.reduce((acc, current) => {
    acc[current.name] = pick(current, ['name', 'collectionName', 'connection', 'description', 'mainField']);
    const attributes = OrderedMap(buildModelAttributes(current.attributes));
    set(acc, [current.name, 'attributes'], attributes);

    return acc;
  }, {});

  return {
    type: GET_DATA_SUCCEEDED,
    initialData,
    models,
    connections,
  };
}

export function onChangeExistingContentTypeMainInfos({ target }) {
  const value = target.name === 'name' ? camelCase(target.value.trim()).toLowerCase() : target.value;

  return {
    type: ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeNewContentTypeMainInfos({ target }) {
  const value = target.name === 'name' ? camelCase(target.value.trim()).toLowerCase() : target.value;

  return {
    type: ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeAttribute({ target }) {
  const value = target.name.includes('name') ? target.value.split(' ').join('') : target.value;

  return {
    type: ON_CHANGE_ATTRIBUTE,
    keys: target.name.split('.'),
    value: value,
  };
}

export function onChangeRelation({ target }) {
  const value = target.name === 'unique' ? target.value : target.value.split(' ').join('');

  return {
    type: ON_CHANGE_RELATION,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeRelationNature(nature, currentModel) {
  return {
    type: ON_CHANGE_RELATION_NATURE,
    currentModel,
    nature,
  };
}

export function onChangeRelationTarget(model, currentModel, isEditing = false) {
  return {
    type: ON_CHANGE_RELATION_TARGET,
    currentModel,
    model,
    isEditing,
  };
}

export function resetNewContentTypeMainInfos() {
  return {
    type: RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  };
}

export function resetEditExistingContentType(contentTypeName) {
  return {
    type: RESET_EDIT_EXISTING_CONTENT_TYPE,
    contentTypeName,
  };
}

export function resetExistingContentTypeMainInfos(contentTypeName) {
  return {
    type: RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
    contentTypeName,
  };
}

export function resetEditTempContentType() {
  return {
    type: RESET_EDIT_TEMP_CONTENT_TYPE,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function saveEditedAttribute(attributeName, isModelTemporary, modelName) {
  return {
    type: SAVE_EDITED_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function saveEditedAttributeRelation(attributeName, isModelTemporary, modelName) {
  return {
    type: SAVE_EDITED_ATTRIBUTE_RELATION,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function setTemporaryAttribute(attributeName, isModelTemporary, modelName) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function setTemporaryAttributeRelation(target, isModelTemporary, source, attributeName, isEditing) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE_RELATION,
    attributeName,
    isEditing,
    isModelTemporary,
    source,
    target,
  };
}

export function submitContentType(oldContentTypeName, data, context, source) {
  const attributes = formatModelAttributes(data.attributes);
  const body = Object.assign(cloneDeep(data), { attributes });

  return {
    type: SUBMIT_CONTENT_TYPE,
    oldContentTypeName,
    body,
    source,
    context,
  };
}

export function submitContentTypeSucceeded() {
  return {
    type: SUBMIT_CONTENT_TYPE_SUCCEEDED,
  };
}

export function submitTempContentType(data, context) {
  const attributes = formatModelAttributes(data.attributes);
  const body = Object.assign(cloneDeep(data), { attributes });

  return {
    type: SUBMIT_TEMP_CONTENT_TYPE,
    body,
    context,
  };
}

export function submitTempContentTypeSucceeded() {
  return {
    type: SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  };
}

export function updateTempContentType() {
  return {
    type: UPDATE_TEMP_CONTENT_TYPE,
  };
}

// utils
export const buildModelAttributes = attributes => {
  const formattedAttributes = attributes.reduce((acc, current) => {
    if (current.params.type === 'enumeration') {
      acc[current.name] = Object.assign(current.params, { enum: current.params.enum.join('\n') });
    } else if (current.params.nature === 'oneWay') {
      acc[current.name] = Object.assign(current.params, { key: '-' });
    } else {
      acc[current.name] = current.params;
    }

    acc[current.name] = fromJS(acc[current.name]);

    return acc;
  }, {});

  return formattedAttributes;
};

export const formatModelAttributes = attributes =>
  Object.keys(attributes).reduce((acc, current) => {
    const attribute = Object.keys(attributes[current]).reduce(
      (acc2, curr) => {
        const value = attributes[current][curr];

        if (
          ((curr.includes('max') || curr.includes('min')) && !value) ||
          curr === 'isVirtual' ||
          (curr === 'dominant' && !value) ||
          (curr === 'columnName' && value === '') ||
          (curr === 'targetColumnName' && value === '')
        ) {
          return acc2;
        }

        if (curr === 'plugin' && !!value) {
          acc2.params.pluginValue = value;
          acc2.params.plugin = true;
        } else if (curr === 'enum') {
          acc2.params.enum = value.split('\n');
        } else if (value !== false) {
          acc2.params[curr] = value;
        } else if (curr === 'configurable') {
          acc2.params[curr] = value;
        }

        return acc2;
      },
      { name: current, params: {} },
    );

    return acc.concat(attribute);
  }, []);
