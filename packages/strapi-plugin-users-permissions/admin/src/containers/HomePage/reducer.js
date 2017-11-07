/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  DELETE_DATA,
  DELETE_DATA_SUCCEEDED,
  FETCH_DATA_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  data: List([]),
  dataToDelete: Map({}),
  deleteActionSucceeded: false,
  deleteEndPoint: '',
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_DATA:
      return state
        .set('dataToDelete', Map(action.dataToDelete))
        .set('deleteEndPoint', action.deleteEndPoint);
    case DELETE_DATA_SUCCEEDED:
      return state
        .update('data', list => list.splice(action.indexDataToDelete, 1))
        .set('deleteEndPoint', '')
        .set('dataToDelete', Map({}))
        .set('deleteActionSucceeded', !state.get('deleteActionSucceeded'));
    case FETCH_DATA_SUCCEEDED:
      return state.set('data', List(action.data));
    default:
      return state;
  }
}

export default homePageReducer;
