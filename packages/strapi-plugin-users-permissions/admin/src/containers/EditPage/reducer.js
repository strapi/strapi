/*
 *
 * EditPage reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  ADD_USER,
  GET_PERMISSIONS_SUCCEEDED,
  GET_ROLE_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_DELETE,
  SET_FORM,
} from './constants';

const initialState = fromJS({
  didDeleteUser: false,
  didGetUsers: false,
  initialData: Map({}),
  modifiedData: Map({}),
  showButtons: false,
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_USER:
      return state
        .updateIn(['modifiedData', 'users'], list => list.push(action.newUser));
    case GET_PERMISSIONS_SUCCEEDED:
      return state
        .updateIn(['initialData', 'permissions'], () => action.permissions)
        .updateIn(['modifiedData', 'permissions'], () => action.permissions);
    case GET_ROLE_SUCCEEDED:
      return state
        .set('didGetUsers', !state.get('didGetUsers'))
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    case ON_CANCEL:
      return state
        .set('showButtons', false)
        .set('didDeleteUser', !state.get('didDeleteUser'))
        .set('modifiedData', state.get('initialData'));
    case ON_CHANGE_INPUT:
      return state
        .set('showButtons', true)
        .updateIn(action.keys, () => action.value);
    case ON_CLICK_DELETE:
      return state
        .set('didDeleteUser', !state.get('didDeleteUser'))
        .set('showButtons', true)
        .updateIn(['modifiedData', 'users'], list => list.filter(o => o.name !== action.itemToDelete.name));
    case SET_FORM:
      return state
        .set('didGetUsers', !state.get('didGetUsers'))
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    default:
      return state;
  }
}

export default editPageReducer;
