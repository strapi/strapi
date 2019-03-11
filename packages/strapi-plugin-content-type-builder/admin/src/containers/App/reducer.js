/*
 *
 * App reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  CANCEL_NEW_CONTENT_TYPE,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL_SUCCEEDED,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE,
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
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case CANCEL_NEW_CONTENT_TYPE:
      return state
        .update('newContentType', () => Map(initialState.get('newContentType')));
    case CREATE_TEMP_CONTENT_TYPE:
      return state
        .update('models', list => list.push({
          icon: 'fa-cube',
          name: state.getIn(['newContentType', 'name']),
          description: state.getIn(['newContentType', 'description']),
          fields: 0,
          isTemporary: true,
        }));
    case DELETE_MODEL_SUCCEEDED:
      return state
        .removeIn(['models', state.get('models').findIndex(model => model.name === action.modelName)])
        .removeIn(['initialData', action.modelName])
        .removeIn(['modifiedData', action.modelName]);
    case GET_DATA_SUCCEEDED:
      return state
        .update('connections', () => List(action.connections))
        .update('initialData', () => action.initialData)
        .update('isLoading', () => false)
        .update('modifiedData', () => action.initialData)
        .updateIn(['newContentType', 'connection'], () => action.connections[0])
        .update('models', () => List(action.models));
    case ON_CHANGE_NEW_CONTENT_TYPE:
      return state
        .updateIn(['newContentType', ...action.keys], () => action.value);
    default:
      return state;
  }
}

export default appReducer;
