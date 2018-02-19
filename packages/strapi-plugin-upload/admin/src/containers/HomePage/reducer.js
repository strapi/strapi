/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  CHANGE_PARAMS,
  DELETE_SUCCESS,
  DROP_SUCCESS,
  GET_DATA_SUCCESS,
  ON_SEARCH,
} from './constants';

const initialState = fromJS({
  deleteSuccess: false,
  dataToDelete: '',
  entriesNumber: 0,
  search: '',
  uploadedFiles: List([Map({})]),
  params: Map({
    sort: 'updatedAt',
    limit: 10,
    page: 1,
  }),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_PARAMS:
      return state.updateIn(actions.keys, () => action.value);
    case DELETE_SUCCESS:
      return state.update('deleteSuccess', (v) => v = !v);
    case DROP_SUCCESS:
      return state
        .update('uploadedFiles', (list) => List(action.newFiles).concat(list));
    case GET_DATA_SUCCESS:
      return state
        .update('uploadedFiles', () => List(action.data))
        .update('entriesNumber', () => action.entriesNumber);
    case ON_SEARCH:
      return state.update('search', () => action.value);
    default:
      return state;
  }
}

export default homePageReducer;
