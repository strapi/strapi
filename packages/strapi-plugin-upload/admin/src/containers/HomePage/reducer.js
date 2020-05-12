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
  ON_SEARCH_SUCCESS,
  SET_LOADING,
  SET_PARAMS,
  UNSET_LOADING,
} from './constants';

const initialState = fromJS({
  deleteSuccess: false,
  dataToDelete: '',
  entriesNumber: 0,
  uploadFilesLoading: false,
  search: '',
  uploadedFiles: List([]),
  params: Map({
    _sort: 'hash:ASC',
    _limit: 10,
    _page: 1,
  }),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_PARAMS:
      return state.updateIn(action.keys, () => action.value);
    case DELETE_SUCCESS:
      return state.update('deleteSuccess', v => (v = !v));
    case DROP_SUCCESS:
      return state.update('uploadedFiles', list =>
        List(action.newFiles).concat(list)
      );
    case GET_DATA_SUCCESS:
      return state
        .update('uploadedFiles', () => List(action.data))
        .update('entriesNumber', () => action.entriesNumber);
    case ON_SEARCH:
      return state.update('search', () => action.value);
    case ON_SEARCH_SUCCESS:
      return state.update('uploadedFiles', () => List(action.data));
    case SET_LOADING:
      return state.update('uploadFilesLoading', () => true);
    case SET_PARAMS:
      return state.set('params', Map(action.params));
    case UNSET_LOADING:
      return state.update('uploadFilesLoading', () => false);
    default:
      return state;
  }
}

export default homePageReducer;
