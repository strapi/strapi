/*
 *
 * EditPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  ON_CANCEL,
  ON_CHANGE_INPUT,
} from './constants';

const initialState = fromJS({
  initialData: Map({
    name: '',
    description: '',
    users: List([]),
  }),
  modifiedData: Map({
    name: '',
    description: '',
    users: List([]),
  }),
  showButtons: false,
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CANCEL:
      return state
      .set('showButtons', false)
      .set('modifiedData', state.get('initialData'));
    case ON_CHANGE_INPUT:
      return state
        .set('showButtons', true)
        .setIn(['modifiedData', action.key], action.value);
    default:
      return state;
  }
}

export default editPageReducer;
