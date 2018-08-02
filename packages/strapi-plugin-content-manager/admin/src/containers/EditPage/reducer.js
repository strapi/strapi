/**
 *
 * EditPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
import {
  ADD_RELATION_ITEM,
  CHANGE_DATA,
  GET_DATA_SUCCEEDED,
  INIT_MODEL_PROPS,
  ON_CANCEL,
  REMOVE_RELATION_ITEM,
  RESET_PROPS,
  SET_FILE_RELATIONS,
  SET_FORM_ERRORS,
  SET_LOADER,
  SORT_RELATIONS,
  SUBMIT_SUCCESS,
  UNSET_LOADER,
} from './constants';

const initialState = fromJS({
  didCheckErrors: true,
  fileRelations: List([]),
  formErrors: List([]),
  formValidations: List([]),
  isCreating: false,
  id: '',
  initialRecord: Map({}),
  isLoading: true,
  modelName: '',
  pluginHeaderTitle: 'New Entry',
  record: fromJS({}),
  resetProps: false,
  showLoader: false,
  source: 'content-manager',
  submitSuccess: false,
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_RELATION_ITEM:
      return state
        .updateIn(['record', action.key], (list) => {
          if (List.isList(list)) {
            return list.push(action.value);
          }

          return List([]) 
            .push(action.value);
        });
    case CHANGE_DATA:
      return state.updateIn(action.keys, () => action.value);
    case GET_DATA_SUCCEEDED:
      return state
        .update('id', () => action.id)
        .update('isLoading', () => false)
        .update('initialRecord', () => fromJS(action.data))
        .update('pluginHeaderTitle', () => action.pluginHeaderTitle)
        .update('record', () => fromJS(action.data));
    case INIT_MODEL_PROPS:
      return state
        .update('formValidations', () => List(action.formValidations))
        .update('isCreating', () => action.isCreating)
        .update('modelName', () => action.modelName)
        .update('record', () => fromJS(action.record))
        .update('source', () => action.source);
    case ON_CANCEL:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('record', () => state.get('initialRecord'))
        .update('resetProps', (v) => v = !v);
    case REMOVE_RELATION_ITEM:
      return state
        .updateIn(['record', action.key], (list) => {
          return list 
            .delete(action.index);
        });
    case RESET_PROPS:
      return initialState;
    case SET_FILE_RELATIONS:
      return state.set('fileRelations', List(action.fileRelations));
    case SET_FORM_ERRORS:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List(action.formErrors));
    case SET_LOADER:
      return state
        .update('showLoader', () => true);
    case SORT_RELATIONS: {
      const item = state.getIn(['record', action.key, action.oldIndex]);

      return state
        .updateIn(['record', action.key], (list) => {
          return list 
            .delete(action.oldIndex)
            .insert(action.newIndex, item);
        });
    }
    case SUBMIT_SUCCESS:
      return state.update('submitSuccess', (v) => v = !v);
    case UNSET_LOADER:
      return state.update('showLoader', () => false);
    default:
      return state;
  }
}

export default editPageReducer;
