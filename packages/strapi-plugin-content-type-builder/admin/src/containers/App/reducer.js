/*
 *
 * App reducer
 *
 */

import { fromJS, List, Map, OrderedMap } from 'immutable';
import pluralize from 'pluralize';
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
  DELETE_GROUP_ATTRIBUTE,
  DELETE_GROUP_SUCCEEDED,
  DELETE_MODEL_ATTRIBUTE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_GROUP,
  DELETE_TEMPORARY_MODEL,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_EXISTING_GROUP_MAIN_INFOS,
  ON_CHANGE_NEW_GROUP_MAIN_INFOS,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  ON_CHANGE_ATTRIBUTE_GROUP,
  ON_CHANGE_RELATION,
  ON_CHANGE_RELATION_GROUP,
  ON_CHANGE_RELATION_NATURE,
  ON_CHANGE_RELATION_NATURE_GROUP,
  ON_CHANGE_RELATION_TARGET,
  ON_CHANGE_RELATION_TARGET_GROUP,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EXISTING_GROUP_MAIN_INFOS,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EDIT_EXISTING_GROUP,
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
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_GROUP_SUCCEEDED,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  SUBMIT_TEMP_GROUP_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
  UPDATE_TEMP_GROUP,
} from './constants';

export const initialState = fromJS({
  connections: List([]),
  groups: List([]),
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
    attributes: OrderedMap({}),
  },
  newContentTypeClone: {
    collectionName: '',
    connection: '',
    description: '',
    mainField: '',
    name: '',
    attributes: OrderedMap({}),
  },
  temporaryAttribute: {},
  temporaryAttributeGroup: {},
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
  temporaryAttributeRelationGroup: {
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
  initialTemporaryAttributeRelationGroup: {
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

  //// GROUP RELATED DATA ////
  initialDataGroup: {},
  modifiedDataGroup: {},
  newGroup: {
    attributes: [],
    collectionName: '',
    connection: '',
    description: '',
    name: '',
  },
  newGroupClone: {
    attributes: [],
    collectionName: '',
    connection: '',
    description: '',
    name: '',
  },
});

export const shouldPluralizeKey = nature =>
  ['manyToMany', 'manyToOne'].includes(nature);
export const shouldPluralizeName = nature =>
  ['manyToMany', 'oneToMany', 'manyWay'].includes(nature);

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_RELATION: {
      const { isModelTemporary, modelName } = action;
      const basePath = isModelTemporary
        ? ['newContentType']
        : ['modifiedData', modelName];
      const { key, name, nature, target } = state
        .get('temporaryAttributeRelation')
        .toJS();

      let newState = state.updateIn([...basePath, 'attributes', name], () => {
        const newAttribute = state
          .get('temporaryAttributeRelation')
          .remove('name');

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
    case ADD_ATTRIBUTE_RELATION_GROUP: {
      const { isGroupTemporary, groupName } = action;
      const basePath = isGroupTemporary
        ? ['newGroup']
        : ['modifiedDataGroup', groupName];

      return state
        .updateIn([...basePath, 'attributes'], arr =>
          arr.push(state.get('temporaryAttributeRelationGroup'))
        )
        .update('temporaryAttributeRelationGroup', () =>
          Map(initialState.get('temporaryAttributeRelationGroup'))
        );
    }
    case ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE: {
      return state
        .updateIn(
          [
            'modifiedData',
            action.contentTypeName,
            'attributes',
            state.getIn(['temporaryAttribute', 'name']),
          ],
          () => {
            const temporaryAttributeType = state.getIn([
              'temporaryAttribute',
              'type',
            ]);
            const type =
              action.attributeType === 'number'
                ? temporaryAttributeType
                : action.attributeType;
            const newAttribute = state
              .get('temporaryAttribute')
              .remove('name')
              .setIn(['type'], type);

            return newAttribute;
          }
        )
        .update('temporaryAttribute', () => Map({}));
    }
    case ADD_ATTRIBUTE_TO_EXISTING_GROUP: {
      const temporaryAttributeType = state.getIn([
        'temporaryAttributeGroup',
        'type',
      ]);
      const type =
        action.attributeType === 'number'
          ? temporaryAttributeType
          : action.attributeType;

      const newAttribute = state
        .get('temporaryAttributeGroup')
        .setIn(['type'], type);

      return state
        .updateIn(['modifiedDataGroup', action.groupName, 'attributes'], arr =>
          arr.push(newAttribute)
        )
        .update('temporaryAttributeGroup', () => Map({}));
    }
    case ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE: {
      return state
        .updateIn(
          [
            'newContentType',
            'attributes',
            state.getIn(['temporaryAttribute', 'name']),
          ],
          () => {
            const temporaryAttributeType = state.getIn([
              'temporaryAttribute',
              'type',
            ]);
            const type =
              action.attributeType === 'number'
                ? temporaryAttributeType
                : action.attributeType;
            const newAttribute = state
              .get('temporaryAttribute')
              .remove('name')
              .setIn(['type'], type);

            return newAttribute;
          }
        )
        .update('temporaryAttribute', () => Map({}));
    }
    case ADD_ATTRIBUTE_TO_TEMP_GROUP: {
      const temporaryAttributeType = state.getIn([
        'temporaryAttributeGroup',
        'type',
      ]);
      const type =
        action.attributeType === 'number'
          ? temporaryAttributeType
          : action.attributeType;

      const newAttribute = state
        .get('temporaryAttributeGroup')
        .setIn(['type'], type);

      return state
        .updateIn(['newGroup', 'attributes'], arr => arr.push(newAttribute))
        .update('temporaryAttributeGroup', () => Map({}));
    }
    case CANCEL_NEW_CONTENT_TYPE:
      return state.update('newContentType', () =>
        Map(
          initialState
            .get('newContentType')
            .set('connection', state.getIn(['connections', 0]))
        )
      );
    case CLEAR_TEMPORARY_ATTRIBUTE:
      return state.update('temporaryAttribute', () => Map({}));
    case CLEAR_TEMPORARY_ATTRIBUTE_GROUP:
      return state.update('temporaryAttributeGroup', () => Map({}));
    case CLEAR_TEMPORARY_ATTRIBUTE_RELATION:
      return state
        .update('temporaryAttribute', () => Map({}))
        .update('temporaryAttributeRelation', () =>
          initialState.get('temporaryAttributeRelation')
        )
        .update('initialTemporaryAttributeRelation', () =>
          initialState.get('temporaryAttributeRelation')
        );
    case CLEAR_TEMPORARY_ATTRIBUTE_RELATION_GROUP:
      return state
        .update('temporaryAttributeGroup', () => Map({}))
        .update('temporaryAttributeRelationGroup', () =>
          initialState.get('temporaryAttributeRelationGroup')
        )
        .update('initialTemporaryAttributeRelationGroup', () =>
          initialState.get('temporaryAttributeRelationGroup')
        );
    case CREATE_TEMP_CONTENT_TYPE:
      return state
        .update('models', list =>
          list.push(
            fromJS({
              icon: 'fa-cube',
              name: state.getIn(['newContentType', 'name']),
              description: state.getIn(['newContentType', 'description']),
              fields: 0,
              isTemporary: true,
            })
          )
        )
        .update('newContentTypeClone', () => state.get('newContentType'));
    case CREATE_TEMP_GROUP:
      return state
        .update('groups', list =>
          list.push(
            fromJS({
              icon: 'fa-cube',
              name: state.getIn(['newGroup', 'name']),
              description: state.getIn(['newGroup', 'description']),
              fields: 0,
              isTemporary: true,
            })
          )
        )
        .update('newGroupClone', () => state.get('newGroup'));
    case DELETE_GROUP_ATTRIBUTE:
      return state.removeIn(action.keys);
    case DELETE_GROUP_SUCCEEDED:
      return state.removeIn([
        'groups',
        state.get('groups').findIndex(group => group.get('uid') === action.uid),
      ]);
    case DELETE_MODEL_ATTRIBUTE: {
      const pathToModelName = action.keys
        .slice()
        .reverse()
        .splice(2)
        .reverse();
      const attributeToDelete = state.getIn(action.keys);
      const modelName = state.getIn([...pathToModelName, 'name']);

      if (
        attributeToDelete.get('target') === modelName &&
        attributeToDelete.get('nature') !== 'oneWay'
      ) {
        return state
          .removeIn(action.keys)
          .removeIn([
            ...action.keys.slice(0, action.keys.length - 1),
            attributeToDelete.get('key'),
          ]);
      }

      return state.removeIn(action.keys);
    }
    case DELETE_MODEL_SUCCEEDED:
      return state
        .removeIn([
          'models',
          state
            .get('models')
            .findIndex(model => model.get('name') === action.modelName),
        ])
        .removeIn(['initialData', action.modelName])
        .removeIn(['modifiedData', action.modelName]);
    case DELETE_TEMPORARY_GROUP:
      return state.removeIn([
        'groups',
        state
          .get('groups')
          .findIndex(group => group.get('isTemporary') === true),
      ]);
    case DELETE_TEMPORARY_MODEL:
      return state
        .removeIn([
          'models',
          state
            .get('models')
            .findIndex(
              model =>
                model.get('name') === state.getIn(['newContentType', 'name'])
            ),
        ])
        .update('newContentType', () =>
          fromJS(initialState.get('newContentType'))
        )
        .update('newContentTypeClone', () =>
          fromJS(initialState.get('newContentType'))
        );
    case GET_DATA_SUCCEEDED:
      return state
        .update('connections', () => List(action.connections))
        .update('initialData', () => fromJS(action.initialData))
        .update('initialDataGroup', () => fromJS(action.initialDataGroup))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.initialData))
        .update('modifiedDataGroup', () => fromJS(action.initialDataGroup))
        .updateIn(['newContentType', 'connection'], () => action.connections[0])
        .update('models', () =>
          List(fromJS(action.models)).sortBy(model => model.get('name'))
        )
        .update('groups', () =>
          List(fromJS(action.groups)).sortBy(group =>
            group.get('uid').toLowerCase()
          )
        );
    case ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_EXISTING_GROUP_MAIN_INFOS:
      return state.updateIn(
        ['modifiedDataGroup', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(
        ['newContentType', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_NEW_GROUP_MAIN_INFOS:
      return state.updateIn(['newGroup', ...action.keys], () => action.value);
    case ON_CHANGE_ATTRIBUTE:
      return state.updateIn(
        ['temporaryAttribute', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_ATTRIBUTE_GROUP:
      return state.updateIn(
        ['temporaryAttributeGroup', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_RELATION:
      return state.updateIn(
        ['temporaryAttributeRelation', ...action.keys],
        () => action.value
      );
    case ON_CHANGE_RELATION_GROUP:
      return state.updateIn(
        ['temporaryAttributeRelationGroup', ...action.keys],
        () => action.value
      );
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
          if (nature === 'oneWay' || nature === 'manyWay') {
            return '-';
          }

          const number = shouldPluralizeKey(nature) ? 2 : 1;
          const newKey =
            nature !== 'oneWay' && key === '-' ? currentModel : key;

          return pluralize(newKey, number);
        });
    }
    case ON_CHANGE_RELATION_NATURE_GROUP: {
      const { nature } = action;

      return state
        .updateIn(['temporaryAttributeRelationGroup', 'nature'], () => nature)
        .updateIn(['temporaryAttributeRelationGroup', 'name'], name => {
          const number = shouldPluralizeName(nature) ? 2 : 1;

          return pluralize(name, number);
        });
    }
    case ON_CHANGE_RELATION_TARGET: {
      const {
        model: { source },
      } = action;
      const nature = state.getIn(['temporaryAttributeRelation', 'nature']);
      const name = shouldPluralizeName(nature)
        ? pluralize(action.model.name)
        : action.model.name;
      let key = shouldPluralizeKey(nature)
        ? pluralize(action.currentModel)
        : action.currentModel;

      if (nature === 'oneWay') {
        key = '-';
      }

      return state
        .updateIn(
          ['temporaryAttributeRelation', 'target'],
          () => action.model.name
        )
        .updateIn(['temporaryAttributeRelation', 'plugin'], () => source || '')
        .updateIn(['temporaryAttributeRelation', 'name'], () => name)
        .updateIn(['temporaryAttributeRelation', 'key'], () => key);
    }
    case ON_CHANGE_RELATION_TARGET_GROUP: {
      const {
        group: { source },
      } = action;

      const nature = state.getIn(['temporaryAttributeRelationGroup', 'nature']);
      const name = shouldPluralizeName(nature)
        ? pluralize(action.group.name)
        : action.group.name;

      return state
        .updateIn(
          ['temporaryAttributeRelationGroup', 'target'],
          () => action.group.name
        )
        .updateIn(
          ['temporaryAttributeRelationGroup', 'plugin'],
          () => source || ''
        )
        .updateIn(['temporaryAttributeRelationGroup', 'name'], () =>
          name.split(' ').join('')
        );
    }
    case RESET_EDIT_EXISTING_CONTENT_TYPE:
      return state
        .update('temporaryAttribute', () => Map({}))
        .updateIn(['modifiedData', action.contentTypeName], () =>
          state.getIn(['initialData', action.contentTypeName])
        );
    case RESET_EDIT_EXISTING_GROUP:
      return state
        .update('temporaryAttributeGroup', () => Map({}))
        .updateIn(['modifiedDataGroup', action.groupName], () =>
          state.getIn(['initialDataGroup', action.groupName])
        );
    case RESET_EDIT_TEMP_CONTENT_TYPE:
      return state.updateIn(['newContentType', 'attributes'], () => Map({}));
    case RESET_EDIT_TEMP_GROUP:
      return state.updateIn(['newGroup', 'attributes'], () => List([]));
    case RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS:
      return state.updateIn(['modifiedData', action.contentTypeName], () => {
        const initialContentType = state
          .getIn(['initialData', action.contentTypeName])
          .set(
            'attributes',
            state.getIn(['modifiedData', action.contentTypeName, 'attributes'])
          );

        return initialContentType;
      });
    case RESET_EXISTING_GROUP_MAIN_INFOS: {
      return state.updateIn(['modifiedDataGroup', action.groupName], () => {
        const initialGroup = state
          .getIn(['initialDataGroup', action.groupName])
          .set(
            'attributes',
            state.getIn(['modifiedDataGroup', action.groupName, 'attributes'])
          );

        return initialGroup;
      });
    }
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
      const basePath = action.isModelTemporary
        ? ['newContentType']
        : ['modifiedData', action.modelName];

      return state
        .updateIn([...basePath, 'attributes'], attributes => {
          const temporaryAttribute = state.get('temporaryAttribute');
          const newAttribute = temporaryAttribute.remove('name');

          return attributes.update(action.attributeName, () => {
            return newAttribute;
          });
        })
        .updateIn([...basePath], obj => {
          const newObj = obj
            .get('attributes')
            .keySeq()
            .reduce((acc, current) => {
              const name =
                current === action.attributeName
                  ? state.getIn(['temporaryAttribute', 'name'])
                  : current;

              acc[name] = obj.getIn(['attributes', current]);

              return acc;
            }, {});

          return obj.set('attributes', OrderedMap(newObj));
        });
    }

    case SAVE_EDITED_ATTRIBUTE_GROUP: {
      const basePath = action.isGroupTemporary
        ? ['newGroup']
        : ['modifiedDataGroup', action.groupName];

      const temporaryAttribute = state.get('temporaryAttributeGroup');
      state.update('temporaryAttributeGroup', () => {});

      return state.updateIn(
        [...basePath, 'attributes', action.attributeIndex],
        () => temporaryAttribute
      );
    }

    case SAVE_EDITED_ATTRIBUTE_RELATION: {
      const basePath = action.isModelTemporary
        ? ['newContentType']
        : ['modifiedData', action.modelName];

      const initialAttribute = state.get('initialTemporaryAttributeRelation');
      const initialRelationNature = initialAttribute.get('nature');
      const initialAttributeName = initialAttribute.get('name');
      const initialAttributeRelationTarget = initialAttribute.get('target');
      const initialAttributeKey = initialAttribute.get('key');
      // const initialTemporaryAttributeRelationTarget = state.getIn([
      //   'initialTemporaryAttributeRelation',
      //   'target',
      // ]);
      const temporaryAttributeRelation = state.get(
        'temporaryAttributeRelation'
      );
      const hasInternalRelation =
        temporaryAttributeRelation.get('target') === action.modelName;
      const updatedRelationNature = temporaryAttributeRelation.get('nature');
      const updatedRelationTarget = temporaryAttributeRelation.get('target');

      const shouldAddComplementaryAttribute =
        ['oneWay', 'manyWay'].includes(initialRelationNature) &&
        !['oneWay', 'manyWay'].includes(updatedRelationNature);

      const shouldRemoveComplementaryAttribute =
        (!['oneWay', 'manyWay'].includes(initialRelationNature) &&
          ['oneWay', 'manyWay'].includes(updatedRelationNature)) ||
        initialAttributeRelationTarget !== updatedRelationTarget;

      const shouldUpdateComplementaryAttribute =
        !['oneWay', 'manyWay'].includes(initialRelationNature) &&
        !['oneWay', 'manyWay'].includes(updatedRelationNature);

      let newState = state;

      if (shouldRemoveComplementaryAttribute) {
        const attributeToRemove = initialAttribute.get('key');

        newState = newState.removeIn([
          ...basePath,
          'attributes',
          attributeToRemove,
        ]);
      }

      const key = state.getIn(['temporaryAttributeRelation', 'key']);
      const otherNewAttribute = newState
        .get('temporaryAttributeRelation')
        .set('key', temporaryAttributeRelation.get('name'))
        .set('dominant', false)
        .update('nature', value => {
          if (updatedRelationNature === 'oneToMany') {
            return 'manyToOne';
          } else if (updatedRelationNature === 'manyToOne') {
            return 'oneToMany';
          } else {
            return value;
          }
        })
        .remove('name');

      if (hasInternalRelation && shouldAddComplementaryAttribute) {
        newState = newState.updateIn(
          [...basePath, 'attributes', key],
          () => otherNewAttribute
        );
      }

      if (
        hasInternalRelation &&
        updatedRelationNature !== 'oneWay' &&
        updatedRelationNature !== 'manyWay' &&
        initialAttributeRelationTarget !== updatedRelationTarget
      ) {
        newState = newState.updateIn(
          [...basePath, 'attributes', key],
          () => otherNewAttribute
        );
      }

      return newState.updateIn([...basePath], obj => {
        const newObj = obj
          .get('attributes')
          .keySeq()
          .reduce((acc, current) => {
            if (current === initialAttributeName) {
              acc[
                temporaryAttributeRelation.get('name')
              ] = temporaryAttributeRelation.remove('name');
            } else if (
              hasInternalRelation &&
              shouldUpdateComplementaryAttribute &&
              current === initialAttributeKey
            ) {
              acc[key] = otherNewAttribute;
            } else {
              acc[current] = obj.getIn(['attributes', current]);
            }

            return acc;
          }, {});

        return obj.set('attributes', OrderedMap(newObj));
      });
    }

    case SAVE_EDITED_ATTRIBUTE_RELATION_GROUP: {
      const basePath = action.isGroupTemporary
        ? ['newGroup', 'attributes', action.attributeIndex]
        : [
            'modifiedDataGroup',
            action.featureName,
            'attributes',
            action.attributeIndex,
          ];
      const temporaryAttribute = state.get('temporaryAttributeRelationGroup');
      state.update('temporaryAttributeRelationGroup', () => {});

      return state.updateIn([...basePath], () => temporaryAttribute);
    }

    case SET_TEMPORARY_ATTRIBUTE:
      return state.update('temporaryAttribute', () => {
        const basePath = action.isModelTemporary
          ? ['newContentType']
          : ['modifiedData', action.modelName];
        const attribute = state
          .getIn([...basePath, 'attributes', action.attributeName])
          .set('name', action.attributeName);

        return attribute;
      });

    case SET_TEMPORARY_ATTRIBUTE_GROUP:
      return state.update('temporaryAttributeGroup', () => {
        const basePath = action.isGroupTemporary
          ? ['newGroup']
          : ['modifiedDataGroup', action.groupName];

        const attribute = state
          .getIn([...basePath, 'attributes', action.attributeIndex])
          .set(
            'name',
            state.getIn([
              ...basePath,
              'attributes',
              action.attributeIndex,
              'name',
            ])
          );

        return attribute;
      });
    case SET_TEMPORARY_ATTRIBUTE_RELATION: {
      if (action.isEditing) {
        const basePath = action.isModelTemporary
          ? ['newContentType']
          : ['modifiedData', action.target];

        return state
          .update('temporaryAttributeRelation', () =>
            state
              .getIn([...basePath, 'attributes', action.attributeName])
              .set('name', action.attributeName)
          )
          .update('initialTemporaryAttributeRelation', () =>
            state
              .getIn([...basePath, 'attributes', action.attributeName])
              .set('name', action.attributeName)
          );
      }

      return state
        .updateIn(['temporaryAttributeRelation', 'target'], () => action.target)
        .updateIn(['temporaryAttributeRelation', 'name'], () => action.target)
        .updateIn(
          ['temporaryAttributeRelation', 'plugin'],
          () => action.source || ''
        );
    }
    case SET_TEMPORARY_ATTRIBUTE_RELATION_GROUP: {
      if (action.isEditing) {
        const basePath = action.isGroupTemporary
          ? ['newGroup']
          : ['modifiedDataGroup', action.target];

        return state
          .update('temporaryAttributeRelationGroup', () =>
            state
              .getIn([...basePath, 'attributes', action.attributeIndex])
              .set('name', action.attributeName)
          )
          .update('initialTemporaryAttributeRelationGroup', () =>
            state
              .getIn([...basePath, 'attributes', action.attributeIndex])
              .set('name', action.attributeName)
          );
      }

      return state
        .updateIn(
          ['temporaryAttributeRelationGroup', 'target'],
          () => action.target
        )
        .updateIn(['temporaryAttributeRelationGroup', 'name'], () =>
          action.target.split(' ').join('')
        )
        .updateIn(
          ['temporaryAttributeRelationGroup', 'plugin'],
          () => action.source || ''
        );
    }
    case SUBMIT_CONTENT_TYPE_SUCCEEDED:
      return state
        .update('isLoading', () => true)
        .update('shouldRefetchData', v => !v);
    case SUBMIT_GROUP_SUCCEEDED:
      return state
        .update('isLoading', () => true)
        .update('shouldRefetchData', v => !v);
    case SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED:
      return state
        .update('isLoading', () => true)
        .update('newContentType', () => Map(initialState.get('newContentType')))
        .update('newContentTypeClone', () =>
          Map(initialState.get('newContentType'))
        )
        .update('shouldRefetchData', v => !v);
    case SUBMIT_TEMP_GROUP_SUCCEEDED:
      return state
        .update('isLoading', () => true)
        .update('newGroup', () => Map(initialState.get('newGroup')))
        .update('newGroupClone', () => Map(initialState.get('newGroup')))
        .update('shouldRefetchData', v => !v);
    case UPDATE_TEMP_CONTENT_TYPE:
      return state
        .updateIn(
          [
            'models',
            state.get('models').findIndex(model => model.isTemporary === true),
            'name',
          ],
          () => state.getIn(['newContentType', 'name'])
        )
        .update('newContentTypeClone', () => state.get('newContentType'));
    case UPDATE_TEMP_GROUP:
      return state
        .updateIn(
          [
            'groups',
            state.get('groups').findIndex(group => group.isTemporary === true),
            'name',
          ],
          () => state.getIn(['newGroup', 'name'])
        )
        .update('newGroupClone', () => state.get('newGroup'));
    default:
      return state;
  }
}

export default appReducer;
