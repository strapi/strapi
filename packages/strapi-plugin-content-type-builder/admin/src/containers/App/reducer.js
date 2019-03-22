/*
 *
 * App reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import pluralize from 'pluralize';
import {
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL_ATTRIBUTE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_MODEL,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  ON_CHANGE_RELATION_TARGET,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  SAVE_EDITED_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE_RELATION,
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
} from './constants';

export const initialState = fromJS({
  connections: List([]),
  initialData: {},
  isLoading: true,
  models: List([]),
  modifiedData: {},
  newContentType: {
    collectionName: '',
    connection: '',
    description: '',
    mainField: '',
    name: '',
    attributes: {},
  },
  newContentTypeClone: {
    collectionName: '',
    connection: '',
    description: '',
    mainField: '',
    name: '',
    attributes: {},
  },
  temporaryAttribute: {},
  temporaryAttributeRelation: {
    name: '',
    columnName: '',
    dominant: false,
    targetColumnName: '',
    key: '-',
    nature: 'oneWay',
    plugin: '',
    target: '',
    unique: false,
  },
});

const shouldPluralizeName = nature => ['manyToMany', 'oneToMany'].includes(nature);
const shouldPluralizeKey = nature => ['manyToMany', 'manyToOne'].includes(nature);

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE: {
      return state
        .updateIn(
          ['modifiedData', action.contentTypeName, 'attributes', state.getIn(['temporaryAttribute', 'name'])],
          () => {
            const temporaryAttributeType = state.getIn(['temporaryAttribute', 'type']);
            const type = action.attributeType === 'number' ? temporaryAttributeType : action.attributeType;
            const newAttribute = state
              .get('temporaryAttribute')
              .remove('name')
              .setIn(['type'], type);

            return newAttribute;
          },
        )
        .update('temporaryAttribute', () => Map({}));
    }
    case ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE: {
      return state
        .updateIn(['newContentType', 'attributes', state.getIn(['temporaryAttribute', 'name'])], () => {
          const temporaryAttributeType = state.getIn(['temporaryAttribute', 'type']);
          const type = action.attributeType === 'number' ? temporaryAttributeType : action.attributeType;
          const newAttribute = state
            .get('temporaryAttribute')
            .remove('name')
            .setIn(['type'], type);

          return newAttribute;
        })
        .update('temporaryAttribute', () => Map({}));
    }
    case CANCEL_NEW_CONTENT_TYPE:
      return state.update('newContentType', () =>
        Map(initialState.get('newContentType').set('connection', state.getIn(['connections', 0]))),
      );
    case CLEAR_TEMPORARY_ATTRIBUTE:
      return state.update('temporaryAttribute', () => Map({}));
    case CLEAR_TEMPORARY_ATTRIBUTE_RELATION:
      return state.update('temporaryAttributeRelation', () => initialState.get('temporaryAttributeRelation'));
    case CREATE_TEMP_CONTENT_TYPE:
      return state
        .update('models', list =>
          list.push({
            icon: 'fa-cube',
            name: state.getIn(['newContentType', 'name']),
            description: state.getIn(['newContentType', 'description']),
            fields: 0,
            isTemporary: true,
          }),
        )
        .update('newContentTypeClone', () => state.get('newContentType'));
    case DELETE_MODEL_ATTRIBUTE:
      return state.removeIn(action.keys);
    case DELETE_MODEL_SUCCEEDED:
      return state
        .removeIn(['models', state.get('models').findIndex(model => model.name === action.modelName)])
        .removeIn(['initialData', action.modelName])
        .removeIn(['modifiedData', action.modelName]);
    case DELETE_TEMPORARY_MODEL:
      return state
        .removeIn([
          'models',
          state.get('models').findIndex(model => model.name === state.getIn(['newContentType', 'name'])),
        ])
        .update('newContentType', () => fromJS(initialState.get('newContentType')))
        .update('newContentTypeClone', () => fromJS(initialState.get('newContentType')));
    case GET_DATA_SUCCEEDED:
      return state
        .update('connections', () => List(action.connections))
        .update('initialData', () => fromJS(action.initialData))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.initialData))
        .updateIn(['newContentType', 'connection'], () => action.connections[0])
        .update('models', () => List(action.models).sortBy(model => model.name));
    case ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(['modifiedData', ...action.keys], () => action.value);
    case ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(['newContentType', ...action.keys], () => action.value);
    case ON_CHANGE_ATTRIBUTE:
      return state.updateIn(['temporaryAttribute', ...action.keys], () => action.value);

    case ON_CHANGE_RELATION_TARGET: {
      const {
        model: { source },
      } = action;
      const nature = state.getIn(['temporaryAttributeRelation', 'nature']);
      // const name = ['manyToMany', 'oneToMany'].includes(nature)
      const name = shouldPluralizeName(nature) ? pluralize(action.model.name) : action.model.name;
      // let key = ['manyToMany', 'manyToOne'].includes(nature)
      let key = shouldPluralizeKey(nature) ? pluralize(action.currentModel) : action.currentModel;

      if (nature === 'oneWay') {
        key = '-';
      }

      if (action.isEditing) {
        return state
          .updateIn(['temporaryAttributeRelation', 'target'], () => action.model.name)
          .updateIn(['temporaryAttributeRelation', 'plugin'], () => source || '');
      }

      return state
        .updateIn(['temporaryAttributeRelation', 'target'], () => action.model.name)
        .updateIn(['temporaryAttributeRelation', 'plugin'], () => source)
        .updateIn(['temporaryAttributeRelation', 'name'], () => name)
        .updateIn(['temporaryAttributeRelation', 'key'], () => key);
    }
    case RESET_EDIT_EXISTING_CONTENT_TYPE:
      return state
        .update('temporaryAttribute', () => Map({}))
        .updateIn(['modifiedData', action.contentTypeName], () =>
          state.getIn(['initialData', action.contentTypeName]),
        );
    case RESET_EDIT_TEMP_CONTENT_TYPE:
      return state.updateIn(['newContentType', 'attributes'], () => Map({}));
    case RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(['modifiedData', action.contentTypeName], () => {
        const initialContentType = state
          .getIn(['initialData', action.contentTypeName])
          .set('attributes', state.getIn(['modifiedData', action.contentTypeName, 'attributes']));

        return initialContentType;
      });
    case RESET_NEW_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(['newContentType'], () => {
        const initialContentType = state
          .get('newContentTypeClone')
          .set('attributes', state.getIn(['newContentType', 'attributes']));

        return initialContentType;
      });
    case RESET_PROPS:
      return initialState;
    case SAVE_EDITED_ATTRIBUTE: {
      const basePath = action.isModelTemporary ? ['newContentType'] : ['modifiedData', action.modelName];

      return state.updateIn([...basePath, 'attributes'], attributes => {
        const temporaryAttribute = state.get('temporaryAttribute');
        const newAttribute = temporaryAttribute.remove('name');

        return attributes.remove(action.attributeName).set(temporaryAttribute.get('name'), newAttribute);
      });
    }
    case SET_TEMPORARY_ATTRIBUTE:
      return state.update('temporaryAttribute', () => {
        const basePath = action.isModelTemporary ? ['newContentType'] : ['modifiedData', action.modelName];
        const attribute = state
          .getIn([...basePath, 'attributes', action.attributeName])
          .set('name', action.attributeName);

        return attribute;
      });

    case SET_TEMPORARY_ATTRIBUTE_RELATION: {
      if (action.isEditing) {
        const basePath = action.isModelTemporary ? ['newContentType'] : ['modifiedData', action.target];

        return state.update('temporaryAttributeRelation', () =>
          state.getIn([...basePath, 'attributes', action.attributeName]).set('name', action.attributeName),
        );
      }

      return state
        .updateIn(['temporaryAttributeRelation', 'target'], () => action.target)
        .updateIn(['temporaryAttributeRelation', 'name'], () => action.target)
        .updateIn(['temporaryAttributeRelation', 'plugin'], () => action.source || '');
    }
    case SUBMIT_CONTENT_TYPE_SUCCEEDED: {
      const newName = state.getIn(['modifiedData', action.oldContentTypeName, 'name']);
      const newState = state
        .updateIn(['modifiedData', newName], () => state.getIn(['modifiedData', action.oldContentTypeName]))
        .updateIn(['initialData', newName], () => state.getIn(['modifiedData', action.oldContentTypeName]));

      if (newName === action.oldContentTypeName) {
        return newState;
      }

      return newState
        .removeIn(['modifiedData', action.oldContentTypeName])
        .removeIn(['initialData', action.oldContentTypeName])
        .updateIn(
          [
            'models',
            state.get('models').findIndex(model => model.name === action.oldContentTypeName),
            'name',
          ],
          () => newName,
        )
        .update('models', models => models.sortBy(model => model.name));
    }
    case SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED:
      return state
        .updateIn(['initialData', state.getIn(['newContentType', 'name'])], () => state.get('newContentType'))
        .updateIn(['modifiedData', state.getIn(['newContentType', 'name'])], () =>
          state.get('newContentType'),
        )
        .updateIn(['models', state.get('models').size - 1, 'isTemporary'], () => false)
        .update('models', list => list.sortBy(el => el.name))
        .update('newContentType', () => Map(initialState.get('newContentType')))
        .update('newContentTypeClone', () => Map(initialState.get('newContentType')));
    case UPDATE_TEMP_CONTENT_TYPE:
      return state
        .updateIn(
          ['models', state.get('models').findIndex(model => model.isTemporary === true), 'name'],
          () => state.getIn(['newContentType', 'name']),
        )
        .update('newContentTypeClone', () => state.get('newContentType'));
    default:
      return state;
  }
}

export default appReducer;
