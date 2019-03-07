/*
 *
 * App reducer
 *
 */

import { fromJS } from 'immutable';
import {
  GET_DATA_SUCCEEDED,
  DELETE_MODEL_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  initialData: {},
  isLoading: true,
  models: [],
  modifiedData: {},
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => action.initialData)
        .update('isLoading', () => false)
        .update('modifiedData', () => action.initialData)
        .update('models', () => action.models);
    case DELETE_MODEL_SUCCEEDED:
      return state
        .removeIn(['models', state.get('models').findIndex(model => model.name === action.modelName)])
        .removeIn(['initialData', action.modelName])
        .removeIn(['modifiedData', action.modelName]);
    default:
      return state;
  }
}

export default appReducer;
