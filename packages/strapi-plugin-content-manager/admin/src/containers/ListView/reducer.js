/**
 *
 * listView reducer
 */

import { fromJS } from 'immutable';
// import {  } from './constants';

export const initialState = fromJS({});

function listViewReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default listViewReducer;
