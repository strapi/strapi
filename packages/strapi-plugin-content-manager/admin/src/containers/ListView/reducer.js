/**
 *
 * listView reducer
 */

import { fromJS, List } from 'immutable';
import { toString } from 'lodash';
import {
  GET_DATA_SUCCEEDED,
  RESET_PROPS,
  ON_CHANGE_BULK,
  ON_CHANGE_BULK_SELECT_ALL,
  ON_DELETE_DATA_SUCCEEDED,
  ON_DELETE_SEVERAL_DATA_SUCCEEDED,
  TOGGLE_MODAL_DELETE,
  TOGGLE_MODAL_DELETE_ALL,
} from './constants';

export const initialState = fromJS({
  count: 0,
  data: List([]),
  entriesToDelete: List([]),
  isLoading: true,
  shouldRefetchData: false,
  showWarningDelete: false,
  showWarningDeleteAll: false,
});

function listViewReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.count)
        .update('data', () => List(action.data))
        .update('isLoading', () => false);
    case ON_CHANGE_BULK:
      return state.update('entriesToDelete', list => {
        const hasElement = list.some(el => el === action.name);

        if (hasElement) {
          return list.filter(el => el !== action.name);
        }

        return list.push(action.name);
      });
    case ON_CHANGE_BULK_SELECT_ALL:
      return state.update('entriesToDelete', list => {
        if (list.size !== 0) {
          return List([]);
        }

        return state.get('data').map(value => toString(value.id));
      });
    case ON_DELETE_DATA_SUCCEEDED:
      return state
        .update('shouldRefetchData', v => !v)
        .update('showWarningDelete', () => false);
    case ON_DELETE_SEVERAL_DATA_SUCCEEDED:
      return state
        .update('shouldRefetchData', v => !v)
        .update('showWarningDeleteAll', () => false);
    case RESET_PROPS:
      return initialState;
    case TOGGLE_MODAL_DELETE:
      return state
        .update('entriesToDelete', () => List([]))
        .update('showWarningDelete', v => !v);
    case TOGGLE_MODAL_DELETE_ALL:
      return state.update('showWarningDeleteAll', v => !v);
    default:
      return state;
  }
}

export default listViewReducer;
