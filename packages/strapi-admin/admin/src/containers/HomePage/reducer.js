/**
 *
 * HomePage reducer
 */

import { fromJS, Map } from 'immutable';

import { ON_CHANGE, SUBMIT_SUCCEEDED } from './constants';

const initialState = fromJS({
  body: Map({
    email: '',
  }),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CHANGE:
      return state.updateIn(['body', 'email'], () => action.value);
    case SUBMIT_SUCCEEDED:
      return state.updateIn(['body', 'email'], () => '');
    default:
      return state;
  }
}

export default homePageReducer;
