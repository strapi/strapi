/*
 *
 * EditPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  ADD_USER,
  GET_PERMISSIONS_SUCCEEDED,
  GET_ROLE_SUCCEEDED,
  GET_USER_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_ADD,
  ON_CLICK_DELETE,
  SET_ACTION_TYPE,
  SET_ERRORS,
  SET_FORM,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  actionType: '',
  didCheckErrors: false,
  didDeleteUser: false,
  didGetUsers: false,
  didFetchUsers: false,
  didSubmit: false,
  formErrors: List([]),
  initialData: Map({}),
  modifiedData: Map({}),
  users: List([]),
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
    case GET_USER_SUCCEEDED:
      return state
        .set('didFetchUsers', !state.get('didFetchUsers'))
        .setIn(['users'], List(action.users));
    case ON_CANCEL:
      return state
        .set('didCheckErrors', !state.get('didCheckErrors'))
        .set('formErrors', List([]))
        .set('didDeleteUser', !state.get('didDeleteUser'))
        .set('modifiedData', state.get('initialData'));
    case ON_CHANGE_INPUT:
      return state
        .updateIn(action.keys, () => action.value);
    case ON_CLICK_ADD:
      return state
        .updateIn(['modifiedData', 'users'], list => list.push(action.itemToAdd));
    case ON_CLICK_DELETE:
      return state
        .set('didDeleteUser', !state.get('didDeleteUser'))
        .updateIn(['modifiedData', 'users'], list => list.filter(o => o.name !== action.itemToDelete.name));
    case SET_ACTION_TYPE:
      return state
        .set('formErrors', List([]))
        .set('actionType', action.actionType);
    case SET_ERRORS:
      return state
        .set('formErrors', List(action.formErrors))
        .set('didCheckErrors', !state.get('didCheckErrors'));
    case SET_FORM:
      return state
        .set('didGetUsers', !state.get('didGetUsers'))
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    case SUBMIT_ERROR:
      return state
        .set('formErrors', List(action.errors));
    case SUBMIT_SUCCEEDED:
      return state
        .set('didSubmit', !state.get('didSubmit'));
    default:
      return state;
  }
}

export default editPageReducer;
