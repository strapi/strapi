/**
 *
 * ListPage reducer
 *
 */

import { fromJS, Map } from 'immutable';

// ListPage constants
import {
  DEFAULT_ACTION,
} from './constants';

const initialState = fromJS({
  params: Map({
    currentPage: 1,
  }),
});

function listPageReducer(state = initialState, action) {
  switch (action.type) {
    case DEFAULT_ACTION:
      return state;
    default:
      return state;
  }
}

export default listPageReducer;
