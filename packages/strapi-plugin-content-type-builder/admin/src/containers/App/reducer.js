/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  GET_DATA_SUCCEEDED,
  DELETE_MODEL_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE,
} from './constants';

export const initialState = fromJS({
  connections: List([]),
  initialData: {},
  isLoading: true,
  models: [],
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
    case GET_DATA_SUCCEEDED:
      return state
        .update('connections', () => List(action.connections))
        .update('initialData', () => action.initialData)
        .update('isLoading', () => false)
        .update('modifiedData', () => action.initialData)
        .updateIn(['newContentType', 'connection'], () => action.connections[0])
        .update('models', () => action.models);
    case DELETE_MODEL_SUCCEEDED:
      return state
        .removeIn(['models', state.get('models').findIndex(model => model.name === action.modelName)])
        .removeIn(['initialData', action.modelName])
        .removeIn(['modifiedData', action.modelName]);
    case ON_CHANGE_NEW_CONTENT_TYPE:
      return state
        .updateIn(['newContentType', ...action.keys], () => action.value);
    default:
      return state;
  }
}

export default appReducer;
