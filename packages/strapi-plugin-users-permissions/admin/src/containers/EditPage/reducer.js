/*
 *
 * EditPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  ADD_USER,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_DELETE,
} from './constants';

const initialState = fromJS({
  didDeleteUser: false,
  initialData: Map({
    name: '',
    description: '',
    users: List([
      { name: 'Pierre Burgy' },
      { name: 'Jim Laurie' },
      { name: 'Aurelien Georget' },
      { name: 'Cyril Lopez' },
    ]),
  }),
  modifiedData: Map({
    name: '',
    description: '',
    users: List([
      { name: 'Pierre Burgy' },
      { name: 'Jim Laurie' },
      { name: 'Aurelien Georget' },
      { name: 'Cyril Lopez' },
    ]),
  }),
  showButtons: false,
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_USER:
      return state.updateIn(['modifiedData', 'users'], list => list.push(action.newUser));
    case ON_CANCEL:
      return state
      .set('showButtons', false)
      .set('didDeleteUser', !state.get('didDeleteUser'))
      .set('modifiedData', state.get('initialData'));
    case ON_CHANGE_INPUT:
      return state
        .set('showButtons', true)
        .setIn(['modifiedData', action.key], action.value);
    case ON_CLICK_DELETE:
      return state
        .set('didDeleteUser', !state.get('didDeleteUser'))
        .set('showButtons', true)
        .updateIn(['modifiedData', 'users'], list => list.filter(o => o.name !== action.itemToDelete.name));
    default:
      return state;
  }
}

export default editPageReducer;
