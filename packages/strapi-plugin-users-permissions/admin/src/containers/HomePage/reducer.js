/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  CANCEL_CHANGES,
  DELETE_DATA,
  DELETE_DATA_SUCCEEDED,
  FETCH_DATA_SUCCEEDED,
  ON_CHANGE,
  SET_FORM,
  SUBMIT_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  data: List([]),
  dataToDelete: Map({}),
  deleteEndPoint: '',
  initialData: Map({}),
  modifiedData: Map({}),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case CANCEL_CHANGES:
      return state
        .update('modifiedData', () => state.get('initialData'));
    case DELETE_DATA:
      return state
        .set('dataToDelete', Map(action.dataToDelete))
        .set('deleteEndPoint', action.deleteEndPoint);
    case DELETE_DATA_SUCCEEDED:
      return state
        .update('data', list => list.splice(action.indexDataToDelete, 1))
        .set('deleteEndPoint', '')
        .set('dataToDelete', Map({}));
    case FETCH_DATA_SUCCEEDED:
      return state.set('data', List(action.data));
    case ON_CHANGE:
      return state
        .updateIn(action.keys, () => action.value);
    case SET_FORM:
      return state
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    case SUBMIT_SUCCEEDED:
      return state
        .update('initialData', () => state.get('modifiedData'));
    default:
      return state;
  }
}

export default homePageReducer;
