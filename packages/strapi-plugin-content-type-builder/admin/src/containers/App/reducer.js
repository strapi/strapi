/*
 *
 * App reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import pluralize from 'pluralize';
import {
  ADD_ATTRIBUTE_RELATION,
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
  ON_CHANGE_RELATION,
  ON_CHANGE_RELATION_TARGET,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  SAVE_EDITED_ATTRIBUTE,
  SAVE_EDITED_ATTRIBUTE_RELATION,
  SET_TEMPORARY_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE_RELATION,
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
  ON_CHANGE_RELATION_NATURE,
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
  initialTemporaryAttributeRelation: {
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
  shouldRefetchData: false,
});

export const shouldPluralizeKey = nature => ['manyToMany', 'manyToOne'].includes(nature);
export const shouldPluralizeName = nature => ['manyToMany', 'oneToMany'].includes(nature);

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_RELATION: {
      const { isModelTemporary, modelName } = action;
      const basePath = isModelTemporary ? ['newContentType'] : ['modifiedData', modelName];
      const { key, name, nature, target } = state.get('temporaryAttributeRelation').toJS();

      let newState = state.updateIn([...basePath, 'attributes', name], () => {
        const newAttribute = state.get('temporaryAttributeRelation').remove('name');

        return newAttribute;
      });

      if (target === modelName && nature !== 'oneWay') {
        newState = newState.updateIn([...basePath, 'attributes', key], () => {
          const newAttribute = state
            .get('temporaryAttributeRelation')
            .set('key', state.getIn(['temporaryAttributeRelation', 'name']))
            .update('dominant', () => false)
            .update('nature', value => {
              if (nature === 'oneToMany') {
                return 'manyToOne';
              } else if (nature === 'manyToOne') {
                return 'oneToMany';
              } else {
                return value;
              }
            })
            .remove('name');

          return newAttribute;
        });
      }

      return newState;
    }
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
      return state
        .update('temporaryAttributeRelation', () => initialState.get('temporaryAttributeRelation'))
        .update('initialTemporaryAttributeRelation', () => initialState.get('temporaryAttributeRelation'));
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
    case DELETE_MODEL_ATTRIBUTE: {
      const pathToModelName = action.keys
        .slice()
        .reverse()
        .splice(2)
        .reverse();
      const attributeToDelete = state.getIn(action.keys);
      const modelName = state.getIn([...pathToModelName, 'name']);

      if (attributeToDelete.get('target') === modelName && attributeToDelete.get('nature') !== 'oneWay') {
        return state
          .removeIn(action.keys)
          .removeIn([...action.keys.slice(0, action.keys.length - 1), attributeToDelete.get('key')]);
      }

      return state.removeIn(action.keys);
    }
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
    case ON_CHANGE_RELATION:
      return state.updateIn(['temporaryAttributeRelation', ...action.keys], () => action.value);
    case ON_CHANGE_RELATION_NATURE: {
      const { currentModel, nature } = action;

      return state
        .updateIn(['temporaryAttributeRelation', 'nature'], () => nature)
        .updateIn(['temporaryAttributeRelation', 'dominant'], () => {
          return nature === 'manyToMany';
        })
        .updateIn(['temporaryAttributeRelation', 'name'], name => {
          const number = shouldPluralizeName(nature) ? 2 : 1;

          return pluralize(name, number);
        })
        .updateIn(['temporaryAttributeRelation', 'key'], key => {
          const number = shouldPluralizeKey(nature) ? 2 : 1;
          const newKey = nature !== 'oneWay' && key === '-' ? currentModel : key;

          if (nature === 'oneWay') {
            return '-';
          }

          return pluralize(newKey, number);
        });
    }
    case ON_CHANGE_RELATION_TARGET: {
      const {
        model: { source },
      } = action;
      const nature = state.getIn(['temporaryAttributeRelation', 'nature']);
      const name = shouldPluralizeName(nature) ? pluralize(action.model.name) : action.model.name;
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
        .updateIn(['temporaryAttributeRelation', 'plugin'], () => source || '')
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
    case SAVE_EDITED_ATTRIBUTE_RELATION: {
      const basePath = action.isModelTemporary ? ['newContentType'] : ['modifiedData', action.modelName];
      const initialTemporaryAttributeRelationTarget = state.getIn([
        'initialTemporaryAttributeRelation',
        'target',
      ]);
      const temporaryAttributeRelation = state.get('temporaryAttributeRelation');
      let newState = state;

      if (
        initialTemporaryAttributeRelationTarget === action.modelName &&
        state.getIn(['initialTemporaryAttributeRelation', 'nature']) !== 'oneWay'
      ) {
        newState = newState
          .removeIn([...basePath, 'attributes', action.attributeName])
          .removeIn([...basePath, 'attributes', state.getIn(['initialTemporaryAttributeRelation', 'key'])]);
      }

      if (
        temporaryAttributeRelation.get('target') === action.modelName &&
        temporaryAttributeRelation.get('nature') !== 'oneWay'
      ) {
        const key = state.getIn(['temporaryAttributeRelation', 'key']);
        const name = state.getIn(['temporaryAttributeRelation', 'name']);
        const nature = state.getIn(['temporaryAttributeRelation', 'nature']);
        const otherNewAttribute = newState
          .get('temporaryAttributeRelation')
          .set('key', name)
          .set('dominant', false)
          .update('nature', value => {
            if (nature === 'oneToMany') {
              return 'manyToOne';
            } else if (nature === 'manyToOne') {
              return 'oneToMany';
            } else {
              return value;
            }
          })
          .remove('name');

        newState = newState.updateIn([...basePath, 'attributes', key], () => otherNewAttribute);
      }

      return newState.updateIn([...basePath, 'attributes'], attributes => {
        const newAttribute = temporaryAttributeRelation.remove('name');

        return attributes
          .remove(action.attributeName)
          .set(temporaryAttributeRelation.get('name'), newAttribute);
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

        return state
          .update('temporaryAttributeRelation', () =>
            state.getIn([...basePath, 'attributes', action.attributeName]).set('name', action.attributeName),
          )
          .update('initialTemporaryAttributeRelation', () =>
            state.getIn([...basePath, 'attributes', action.attributeName]).set('name', action.attributeName),
          );
      }

      return state
        .updateIn(['temporaryAttributeRelation', 'target'], () => action.target)
        .updateIn(['temporaryAttributeRelation', 'name'], () => action.target)
        .updateIn(['temporaryAttributeRelation', 'plugin'], () => action.source || '');
    }
    case SUBMIT_CONTENT_TYPE_SUCCEEDED: {
      return state.update('isLoading', () => true).update('shouldRefetchData', v => !v);
    }
    case SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED:
      return state
        .update('isLoading', () => true)
        .update('newContentType', () => Map(initialState.get('newContentType')))
        .update('newContentTypeClone', () => Map(initialState.get('newContentType')))
        .update('shouldRefetchData', v => !v);
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
