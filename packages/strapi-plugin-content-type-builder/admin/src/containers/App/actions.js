/*
 *
 * App actions
 *
 */
import { cloneDeep, pick, set, camelCase } from 'lodash';
import { fromJS, OrderedMap } from 'immutable';
import {
  ADD_ATTRIBUTE_RELATION,
  ADD_ATTRIBUTE_RELATION_GROUP,
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_EXISTING_GROUP,
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_TEMP_GROUP,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CLEAR_TEMPORARY_ATTRIBUTE_GROUP,
  CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  CLEAR_TEMPORARY_ATTRIBUTE_RELATION_GROUP,
  CREATE_TEMP_CONTENT_TYPE,
  CREATE_TEMP_GROUP,
  DELETE_GROUP,
  DELETE_GROUP_ATTRIBUTE,
  DELETE_GROUP_SUCCEEDED,
  DELETE_MODEL,
  DELETE_MODEL_ATTRIBUTE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_GROUP,
  DELETE_TEMPORARY_MODEL,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_NEW_GROUP_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  ON_CHANGE_ATTRIBUTE_GROUP,
  ON_CHANGE_RELATION,
  ON_CHANGE_RELATION_GROUP,
  ON_CHANGE_RELATION_NATURE,
  ON_CHANGE_RELATION_NATURE_GROUP,
  ON_CHANGE_RELATION_TARGET,
  ON_CHANGE_RELATION_TARGET_GROUP,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_GROUP,
  RESET_EXISTING_GROUP_MAIN_INFOS,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_EDIT_TEMP_GROUP,
  RESET_PROPS,
  SAVE_EDITED_ATTRIBUTE,
  SAVE_EDITED_ATTRIBUTE_GROUP,
  SAVE_EDITED_ATTRIBUTE_RELATION,
  SAVE_EDITED_ATTRIBUTE_RELATION_GROUP,
  SET_TEMPORARY_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE_GROUP,
  SET_TEMPORARY_ATTRIBUTE_RELATION,
  SET_TEMPORARY_ATTRIBUTE_RELATION_GROUP,
  SUBMIT_CONTENT_TYPE,
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_GROUP,
  SUBMIT_GROUP_SUCCEEDED,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_TEMP_GROUP,
  SUBMIT_TEMP_GROUP_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_EXISTING_GROUP_MAIN_INFOS,
} from './constants';

export function addAttributeRelation(isModelTemporary, modelName) {
  return {
    type: ADD_ATTRIBUTE_RELATION,
    isModelTemporary,
    modelName,
  };
}

export function addAttributeRelationGroup(isGroupTemporary, groupName) {
  return {
    type: ADD_ATTRIBUTE_RELATION_GROUP,
    isGroupTemporary,
    groupName,
  };
}

export function addAttributeToExistingContentType(
  contentTypeName,
  attributeType
) {
  return {
    type: ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
    attributeType,
    contentTypeName,
  };
}

export function addAttributeToExistingGroup(groupName, attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_EXISTING_GROUP,
    attributeType,
    groupName,
  };
}

export function addAttributeToTempContentType(attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
    attributeType,
  };
}

export function addAttributeToTempGroup(attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_TEMP_GROUP,
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

export function clearTemporaryAttributeGroup() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE_GROUP,
  };
}

export function clearTemporaryAttributeRelation() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  };
}

export function clearTemporaryAttributeRelationGroup() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE_RELATION_GROUP,
  };
}

export function createTempContentType() {
  return {
    type: CREATE_TEMP_CONTENT_TYPE,
  };
}

export function createTempGroup() {
  return {
    type: CREATE_TEMP_GROUP,
  };
}

export function deleteGroup(uid) {
  return {
    type: DELETE_GROUP,
    uid,
  };
}

export function deleteGroupAttribute(keys) {
  return {
    type: DELETE_GROUP_ATTRIBUTE,
    keys,
  };
}

export function deleteGroupSucceeded(uid) {
  return {
    type: DELETE_GROUP_SUCCEEDED,
    uid,
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

export function deleteTemporaryGroup() {
  return {
    type: DELETE_TEMPORARY_GROUP,
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

export function getDataSucceeded({ allModels, models }, connections, { data }) {
  const initialData = allModels.reduce((acc, current) => {
    acc[current.name] = pick(current, [
      'name',
      'collectionName',
      'connection',
      'description',
      'mainField',
    ]);
    const attributes = OrderedMap(buildModelAttributes(current.attributes));
    set(acc, [current.name, 'attributes'], attributes);

    return acc;
  }, {});

  const initialDataGroup = data.reduce((acc, current) => {
    const { schema, uid } = current;
    const { attributes, name } = schema;

    const group = {
      ...schema,
      attributes: buildGroupAttributes(attributes),
      uid,
      name: name || uid,
      isTemporary: false,
    };
    acc[uid] = group;

    return acc;
  }, {});

  const groups = data.reduce((acc, current) => {
    const {
      schema: { attributes, description, name },
      source,
      uid,
    } = current;

    acc.push({
      uid,
      description: description || '',
      fields: Object.keys(attributes).length,
      icon: 'fa-cube',
      isTemporary: false,
      name: name || uid,
      source: source || null,
    });

    return acc;
  }, []);

  return {
    type: GET_DATA_SUCCEEDED,
    initialData,
    initialDataGroup,
    models,
    connections,
    groups,
  };
}

export function onChangeExistingContentTypeMainInfos({ target }) {
  const value =
    target.name === 'name'
      ? camelCase(target.value.trim()).toLowerCase()
      : target.value;

  return {
    type: ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeExistingGroupMainInfos({ target }) {
  const value =
    target.name === 'name'
      ? camelCase(target.value.trim()).toLowerCase()
      : target.value;

  return {
    type: ON_CHANGE_EXISTING_GROUP_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeNewContentTypeMainInfos({ target }) {
  const value =
    target.name === 'name'
      ? camelCase(target.value.trim()).toLowerCase()
      : target.value;

  return {
    type: ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeNewGroupMainInfos({ target }) {
  const value =
    target.name === 'name'
      ? camelCase(target.value.trim()).toLowerCase()
      : target.value;

  return {
    type: ON_CHANGE_NEW_GROUP_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeAttribute({ target }) {
  const value = target.name.includes('name')
    ? target.value.split(' ').join('')
    : target.value;

  return {
    type: ON_CHANGE_ATTRIBUTE,
    keys: target.name.split('.'),
    value: value,
  };
}

export function onChangeAttributeGroup({ target }) {
  const value = target.name.includes('name')
    ? target.value.split(' ').join('')
    : target.value;

  return {
    type: ON_CHANGE_ATTRIBUTE_GROUP,
    keys: target.name.split('.'),
    value: value,
  };
}

export function onChangeRelation({ target }) {
  const value =
    target.name === 'unique' ? target.value : target.value.split(' ').join('');

  return {
    type: ON_CHANGE_RELATION,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeRelationGroup({ target }) {
  const value =
    target.name === 'unique' ? target.value : target.value.split(' ').join('');

  return {
    type: ON_CHANGE_RELATION_GROUP,
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

export function onChangeRelationNatureGroup(nature, currentGroup) {
  return {
    type: ON_CHANGE_RELATION_NATURE_GROUP,
    currentGroup,
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

export function onChangeRelationTargetGroup(
  group,
  currentGroup,
  isEditing = false
) {
  return {
    type: ON_CHANGE_RELATION_TARGET_GROUP,
    currentGroup,
    group,
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

export function resetEditExistingGroup(groupName) {
  return {
    type: RESET_EDIT_EXISTING_GROUP,
    groupName,
  };
}

export function resetExistingGroupMainInfos(groupName) {
  return {
    type: RESET_EXISTING_GROUP_MAIN_INFOS,
    groupName,
  };
}

export function resetEditTempContentType() {
  return {
    type: RESET_EDIT_TEMP_CONTENT_TYPE,
  };
}

export function resetEditTempGroup() {
  return {
    type: RESET_EDIT_TEMP_GROUP,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function saveEditedAttribute(
  attributeName,
  isModelTemporary,
  modelName
) {
  return {
    type: SAVE_EDITED_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function saveEditedAttributeGroup(
  attributeIndex,
  isGroupTemporary,
  groupName
) {
  return {
    type: SAVE_EDITED_ATTRIBUTE_GROUP,
    attributeIndex,
    isGroupTemporary,
    groupName,
  };
}

export function saveEditedAttributeRelation(
  attributeName,
  isModelTemporary,
  modelName
) {
  return {
    type: SAVE_EDITED_ATTRIBUTE_RELATION,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function saveEditedAttributeRelationGroup(
  attributeIndex,
  isGroupTemporary,
  featureName
) {
  return {
    type: SAVE_EDITED_ATTRIBUTE_RELATION_GROUP,
    attributeIndex,
    isGroupTemporary,
    featureName,
  };
}

export function setTemporaryAttribute(
  attributeName,
  isModelTemporary,
  modelName
) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function setTemporaryAttributeGroup(
  attributeIndex,
  isGroupTemporary,
  groupName
) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE_GROUP,
    attributeIndex,
    isGroupTemporary,
    groupName,
  };
}

export function setTemporaryAttributeRelation(
  target,
  isModelTemporary,
  source,
  attributeName,
  isEditing
) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE_RELATION,
    attributeName,
    isEditing,
    isModelTemporary,
    source,
    target,
  };
}

export function setTemporaryAttributeRelationGroup(
  target,
  isGroupTemporary,
  source,
  attributeIndex,
  attributeName,
  isEditing
) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE_RELATION_GROUP,
    attributeIndex,
    attributeName,
    isEditing,
    isGroupTemporary,
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

export function submitGroup(oldGroupName, data, context, source) {
  const attributes = formatGroupAttributes(data.attributes);
  delete data['uid'];
  delete data['isTemporary'];
  const body = Object.assign(cloneDeep(data), { attributes });

  return {
    type: SUBMIT_GROUP,
    oldGroupName,
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

export function submitGroupSucceeded() {
  return {
    type: SUBMIT_GROUP_SUCCEEDED,
  };
}

export function submitTempContentTypeSucceeded() {
  return {
    type: SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  };
}

export function submitTempGroup(data, context) {
  const attributes = formatGroupAttributes(data.attributes);
  const body = Object.assign(cloneDeep(data), { attributes });

  return {
    type: SUBMIT_TEMP_GROUP,
    body,
    context,
  };
}

export function submitTempGroupSucceeded() {
  return {
    type: SUBMIT_TEMP_GROUP_SUCCEEDED,
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
      acc[current.name] = Object.assign(current.params, {
        enum: current.params.enum.join('\n'),
      });
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
      { name: current, params: {} }
    );

    return acc.concat(attribute);
  }, []);

export const buildGroupAttributes = attributes =>
  Object.keys(attributes).reduce((acc, current) => {
    if (
      attributes[current].nature === 'oneWay' ||
      attributes[current].nature === 'manyWays'
    ) {
      const attribute = Object.assign(attributes[current], {
        key: '-',
        name: current,
      });
      return acc.concat(attribute);
    } else {
      const attribute = { name: current, ...attributes[current] };
      return acc.concat(attribute);
    }
  }, []);

export const formatGroupAttributes = attributes => {
  const formattedAttributes = attributes.reduce((acc, current) => {
    const name = current['name'];
    let newAttribute = { ...current };
    delete newAttribute['name'];

    acc[name] = newAttribute;
    return acc;
  }, {});

  return formattedAttributes;
};
