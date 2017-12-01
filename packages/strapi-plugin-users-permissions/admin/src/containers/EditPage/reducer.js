/*
 *
 * EditPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import { map } from 'lodash';
import {
  ADD_USER,
  GET_PERMISSIONS_SUCCEEDED,
  GET_POLICIES_SUCCEEDED,
  GET_ROLE_SUCCEEDED,
  GET_USER_SUCCEEDED,
  GET_ROUTES_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_ADD,
  ON_CLICK_DELETE,
  RESET_SHOULD_DISPLAY_POLICIES_HINT,
  SELECT_ALL_ACTIONS,
  SET_ACTION_TYPE,
  SET_ERRORS,
  SET_FORM,
  SET_INPUT_POLICIES_PATH,
  SET_ROLE_ID,
  SET_SHOULD_DISPLAY_POLICIES_HINT,
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
  inputPoliciesPath: '',
  modifiedData: Map({}),
  policies: List([]),
  roleId: '',
  routes: Map([]),
  shouldDisplayPoliciesHint: true,
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
    case GET_POLICIES_SUCCEEDED:
      return state.set('policies', List(action.policies));
    case GET_ROLE_SUCCEEDED:
      return state
        .set('didGetUsers', !state.get('didGetUsers'))
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    case GET_ROUTES_SUCCEEDED:
      return state.set('routes', Map(action.routes.routes));
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
        .updateIn(['modifiedData', 'users'], list => list.filter(o => o[o.id ? 'id' : '_id'] !== action.itemToDelete[o.id ? 'id' : '_id']));
    case RESET_SHOULD_DISPLAY_POLICIES_HINT:
      return state.set('shouldDisplayPoliciesHint', true);
    case SELECT_ALL_ACTIONS: {
      const controllerActions = state.getIn(action.keys).toJS();
      map(controllerActions, (value, key) => {
        controllerActions[key].enabled = action.shouldEnable;
      });
      return state
        .updateIn(action.keys, () => Map(fromJS(controllerActions)));
    }
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
    case SET_INPUT_POLICIES_PATH:
      return state.set('inputPoliciesPath', action.inputPath);
    case SET_ROLE_ID:
      return state.set('roleId', action.roleId);
    case SET_SHOULD_DISPLAY_POLICIES_HINT:
      return state.set('shouldDisplayPoliciesHint', false);
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
