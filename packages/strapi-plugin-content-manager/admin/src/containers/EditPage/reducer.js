/**
 *
 * EditPage reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  CHANGE_DATA,
  GET_DATA_SUCCEEDED,
  INIT_MODEL_PROPS,
  RESET_PROPS,
} from './constants';

const initialState = fromJS({
  didCheckErrors: true,
  isCreating: false,
  id: '',
  modelName: '',
  pluginHeaderTitle: 'New Entry',
  record: Map({}),
  source: 'content-manager',
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_DATA:
      return state.updateIn(action.keys, () => action.value);
    case GET_DATA_SUCCEEDED:
      return state
        .update('id', () => action.id)
        .update('pluginHeaderTitle', () => action.pluginHeaderTitle)
        .update('record', () => Map(action.data));
    case INIT_MODEL_PROPS:
      return state
        .update('isCreating', () => action.isCreating)
        .update('modelName', () => action.modelName)
        .update('source', () => action.source);
    case RESET_PROPS:
      return initialState;
    default:
      return state;
  }
}

export default editPageReducer;
