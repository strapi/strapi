/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';
import { findIndex, get } from 'lodash';
import Manager from 'utils/Manager';
import {
  EMPTY_STORE,
  GET_MODEL_ENTRIES_SUCCEEDED,
  LOAD_MODELS,
  LOADED_MODELS,
  MOVE_ATTR,
  MOVE_ATTR_EDIT_VIEW,
  MOVE_VARIABLE_ATTR_EDIT_VIEW,
  ON_CHANGE,
  ON_CHANGE_SETTINGS,
  ON_CLICK_ADD_ATTR,
  ON_REMOVE,
  ON_REMOVE_EDIT_VIEW_ATTR,
  ON_REMOVE_EDIT_VIEW_FIELD_ATTR,
  ON_RESET,
  SUBMIT_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  formValidations: List([]),
  loading: true,
  modelEntries: 0,
  modifiedSchema: fromJS({}),
  schema: fromJS({}),
  submitSuccess: false,
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
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'listDisplay'], list => (
          list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex))
        ));
    case MOVE_ATTR_EDIT_VIEW:
      return state
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.')], list => (
          list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex))
        ));
    case MOVE_VARIABLE_ATTR_EDIT_VIEW:
      return state
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
          return list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex));
        });
    case ON_CHANGE:
      return state
        // NOTE: need comments
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
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.')], list => list.push(fromJS(action.data)));
    case ON_REMOVE:
      return state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'listDisplay'], list => {

        // If the list is empty add the default Id attribute
        if (list.size -1 === 0) {
          const attrToAdd = state.getIn(['schema', 'models', ...action.keys.split('.'), 'listDisplay'])
            .filter(attr => {
              return attr.get('name') === '_id' || attr.get('name') === 'id';
            });
          
          attrToAdd.setIn(['0', 'sortable'], () => true);
          
          return list
            .delete(action.index)
            .push(attrToAdd.get('0'));
        }

        return list.delete(action.index);
      });
    case ON_REMOVE_EDIT_VIEW_ATTR:
      return state.updateIn(['modifiedSchema', 'models'].concat(action.keys.split('.')), list => {
        return list.delete(action.index);
      });
    case ON_REMOVE_EDIT_VIEW_FIELD_ATTR:
      return state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
        // Don't do any check if removing the item of the array
        if (action.index === list.size - 1) {
          return list.delete(action.index);
        }
        
        const manager = new Manager(state, list, action.keys, action.index);
        // Retrieve the removed element infos
        const attrToRemoveInfos = manager.attrToRemoveInfos;
        const arrayOfLastLineElements = manager.arrayOfEndLineElements;
        // Retrieve the removed element bounds
        const nodeBounds = { left: manager.getBound(false), right: manager.getBound(true) };
        const isRemovingAFullWidthNode = attrToRemoveInfos.bootstrapCol === 12;

        // If removing we need to add the corresponding missing col in the prev line
        if (isRemovingAFullWidthNode) {
          const currentNodeLine = findIndex(arrayOfLastLineElements, ['index', attrToRemoveIndex]);
          const previousLineBounds = { left: manager.getBound(false, attrToRemoveInfos.index - 1), right: getBound(true, attrToRemoveInfos.index - 1) };
          const leftBoundIndex = get(previousLineBounds, ['left', 'index'], 0);
          const rightBoundIndex = get(previousLineBounds, ['right', 'index'], 0);
          const previousLineNumberOfItems = Math.abs(leftBoundIndex - rightBoundIndex) - 1;
          const previousLineColNumber = manager.getLineColSize(leftBoundIndex, rightBoundIndex);
    
          // Don't add node if removing from the first line or after a complete line
          if (currentNodeLine === 0 || previousLineNumberOfItems === -1 || previousLineColNumber >= 10) {
            return list.delete(action.index);
          }

          const colNumberToAdd = 12 - previousLineColNumber;
          const colsToAdd = colNumberToAdd === 8 ? ['col-md-4'] : (() => {
            switch(colNumberToAdd) {
              case 9:
                return ['col-md-3', 'col-md-6'];
              case 6:
                return ['col-md-6'];
              default:
                return ['col-md-3'];

            }
          })();

          return list
            .delete(attrToRemoveIndex)
            .insert(attrToRemoveIndex, colsToAdd);
        } else {
          const leftBoundIndex = get(nodeBounds, ['left', 'index'], 0);
          const rightBoundIndex = get(nodeBounds, ['right', 'index'], 0);
          const currentLineColSize = manager.getLineColSize(leftBoundIndex, rightBoundIndex);
          const isRemovingLine = currentLineColSize - attrToRemoveInfos.bootstrapCol === 0;

          if (isRemovingLine) {
            return list.delete(attrToRemoveInfos.infos);
          }

          return list
            .delete(attrToRemoveInfos.index)
            .insert(rightBoundIndex, `col-md-${attrToRemoveInfos.bootstrapCol}`);
        }
      });
    case ON_RESET:
      return state
        .update('modifiedSchema', () => state.get('schema'));
    case SUBMIT_SUCCEEDED:
      return state
        .update('submitSuccess', v => v = !v)
        .update('schema', () => state.get('modifiedSchema'));
    default:
      return state;
  }
}

export default appReducer;