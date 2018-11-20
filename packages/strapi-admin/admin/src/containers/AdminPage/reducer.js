/**
 *
 * AdminPage reducer
 *
 */

import { fromJS, Map } from 'immutable';

import {
  GET_ADMIN_DATA_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  uuid: false,
  currentEnvironment: 'development',
  isLoading: true,
  layout: Map({}),
  strapiVersion: '3',
});

function adminPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_ADMIN_DATA_SUCCEEDED:
      return state
        .update('uuid', () => action.data.uuid)
        .update('currentEnvironment', () => action.data.currentEnvironment)
        .update('layout', () => Map(action.data.layout))
        .update('strapiVersion', () => action.data.strapiVersion)
        .update('isLoading', () => false);
    default:
      return state;
  }
}

export default adminPageReducer;
