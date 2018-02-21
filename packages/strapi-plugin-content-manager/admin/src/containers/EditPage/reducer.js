/**
 *
 * EditPage reducer
 *
 */

import { fromJS } from 'immutable';
import {
  INIT_MODEL_PROPS,
} from './constants';

const initialState = fromJS({
  isCreating: false,
  modelName: '',
  pluginHeaderTitle: 'New Entry',
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case INIT_MODEL_PROPS:
      return state
        .update('isCreating', () => action.isCreating)
        .update('modelName', () => action.modelName);
    default:
      return state;
  }
}

export default editPageReducer;
