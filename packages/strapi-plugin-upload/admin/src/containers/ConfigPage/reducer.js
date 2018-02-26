/**
 *
 * ConfigPage reducer
 *
 */

import { fromJS } from 'immutable';

const initialState = fromJS({});

function configPageReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default configPageReducer;
