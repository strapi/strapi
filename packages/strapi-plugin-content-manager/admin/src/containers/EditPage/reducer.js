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
  MOVE_ATTR,
  MOVE_ATTR_END,
  ON_CANCEL,
  ON_REMOVE_RELATION_ITEM,
  RESET_PROPS,
  SET_FILE_RELATIONS,
  SET_FORM_ERRORS,
  SET_LOADER,
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
  isDraggingSibling: false,
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
            return list 
              .push(action.value);
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
    case MOVE_ATTR:
      return state
        .updateIn(['record', action.keys], list => {
          return list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex));
        })
        .update('isDraggingSibling', () => true);
    case MOVE_ATTR_END:
      return state.update('isDraggingSibling', () => false);
    case ON_CANCEL:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('record', () => state.get('initialRecord'))
        .update('resetProps', (v) => v = !v);
    case ON_REMOVE_RELATION_ITEM:
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
    case SUBMIT_SUCCESS:
      return state.update('submitSuccess', (v) => v = !v);
    case UNSET_LOADER:
      return state.update('showLoader', () => false);
    default:
      return state;
  }
}

export default editPageReducer;
