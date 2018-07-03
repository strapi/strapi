/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  EMPTY_STORE,
  GET_MODEL_ENTRIES_SUCCEEDED,
  LOAD_MODELS,
  LOADED_MODELS,
  MOVE_ATTR,
  ON_CHANGE,
  ON_CHANGE_SETTINGS,
  ON_CLICK_ADD_ATTR,
  ON_REMOVE,
  ON_RESET,
  ON_SUBMIT,
} from './constants';

const initialState = fromJS({
  modelEntries: 0,
  loading: true,
  modifiedSchema: fromJS({}),
  schema: fromJS({}),
  formValidations: List([]),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case EMPTY_STORE:
      return state;
    case GET_MODEL_ENTRIES_SUCCEEDED:
      return state.set('modelEntries', action.count);
    case LOAD_MODELS:
      return state;
    case LOADED_MODELS:
      return state
        .update('schema', () => fromJS(action.models.models))
        .update('modifiedSchema', () => fromJS(action.models.models))
        .set('loading', false);
    case MOVE_ATTR:
      return state
        .updateIn(['modifiedSchema', 'models'].concat(action.keys.split('.')).concat(['listDisplay']), list => (
          list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex))
        ));
    case ON_CHANGE:
      return state
        .updateIn(['modifiedSchema'].concat(action.keys), () => action.value)
        .updateIn(['modifiedSchema', 'models'], models => {
          return models
            .keySeq()
            .reduce((acc, current) => {

              if (current !== 'plugins') {
                return acc.setIn([current, action.keys[1]], action.value);
              }
              
              return acc
                .get(current)
                .keySeq()
                .reduce((acc1, curr) => {
                  return acc1
                    .getIn([current, curr])
                    .keySeq()
                    .reduce((acc2, curr1) => {
                  
                      return acc2.setIn([ current, curr, curr1, action.keys[1]], action.value);
                    }, acc1);
                }, acc);
            }, models);
        });
    case ON_CHANGE_SETTINGS:
      return state
        .updateIn(['modifiedSchema', 'models'].concat(action.keys), () => action.value);
    case ON_CLICK_ADD_ATTR:
      return state
        .updateIn(['modifiedSchema', 'models'].concat(action.keys.split('.')).concat(['listDisplay']), list => list.push(fromJS(action.data)));
    case ON_REMOVE:
      return state.updateIn(['modifiedSchema', 'models'].concat(action.keys.split('.')).concat(['listDisplay']), list => (
        list.delete(action.index)
      ));
    case ON_RESET:
      return state
        .update('modifiedSchema', () => state.get('schema'));
    case ON_SUBMIT:
      return state
        .update('schema', () => state.get('modifiedSchema'));
    default:
      return state;
  }
}

export default appReducer;
