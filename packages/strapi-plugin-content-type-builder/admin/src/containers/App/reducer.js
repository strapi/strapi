/*
 *
 * App reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_MODEL,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE,
  ON_CREATE_ATTRIBUTE,
  ON_UPDATING_EXISTING_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
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
  temporaryAttribute: {},
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE: {
      return state
        .updateIn(['newContentType', 'attributes', state.getIn(['temporaryAttribute', 'name'])], () => {
          const temporaryAttributeType = state.getIn(['temporaryAttribute', 'type']);
          const type = action.attributeType === 'number' ? temporaryAttributeType : action.attributeType;
          const newAttribute = state
            .get('temporaryAttribute')
            .remove('name')
            .setIn(['type'], type);

          return newAttribute.get('temporaryAttribute');
        })
        .update('temporaryAttribute', () => Map({}));
    }
    case CANCEL_NEW_CONTENT_TYPE:
      return state.update('newContentType', () => Map(initialState.get('newContentType')));
    case CLEAR_TEMPORARY_ATTRIBUTE:
      return state.update('temporaryAttribute', () => Map({}));
    case CREATE_TEMP_CONTENT_TYPE:
      return state.update('models', list =>
        list.push({
          icon: 'fa-cube',
          name: state.getIn(['newContentType', 'name']),
          description: state.getIn(['newContentType', 'description']),
          fields: 0,
          isTemporary: true,
        }),
      );
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
        .update('newContentType', () => fromJS(initialState.get('newContentType')));
    case GET_DATA_SUCCEEDED:
      return state
        .update('connections', () => List(action.connections))
        .update('initialData', () => action.initialData)
        .update('isLoading', () => false)
        .update('modifiedData', () => action.initialData)
        .updateIn(['newContentType', 'connection'], () => action.connections[0])
        .update('models', () => List(action.models));
    case ON_CHANGE_NEW_CONTENT_TYPE:
      return state.updateIn(['newContentType', ...action.keys], () => action.value);
    case ON_CREATE_ATTRIBUTE:
      return state.updateIn(['temporaryAttribute', ...action.keys], () => action.value);
    case ON_UPDATING_EXISTING_CONTENT_TYPE:
      return state.updateIn(['modifiedData', ...action.keys], () => action.value);
    case SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED:
      return state
        .updateIn(['modifiedData', state.getIn(['newContentType', 'name'])], () =>
          state.get('newContentType'),
        )
        .updateIn(['models', state.get('models').size - 1, 'isTemporary'], () => false)
        .update('models', list => list.sortBy(el => el.name))
        .update('newContentType', () => Map(initialState.get('newContentType')));
    default:
      return state;
  }
}

export default appReducer;
