/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';
import { findIndex, get } from 'lodash';
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

const getBootStrapCol = attrType => {
  switch(attrType) {
    case 'checkbox':
    case 'boolean':
      return 3;
    case 'date':
      return 4;
    case 'json':
    case 'wysiwyg':
      return 12;
    default:
      return 6;
  }
};

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

        // Helpers
        /**
         * 
         * @param {String} itemName 
         * @returns {String} the item's type
         */
        const getType = (itemName) => {
          return state.getIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'availableFields', itemName, 'type']);
        };
        /**
         * 
         * @param {Number} itemIndex
         * @returns {String} The item's name
         */
        const getAttrName = itemIndex => {
          return state.getIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields', itemIndex]);
        };
        /**
         * 
         * @param {Number} leftBound 
         * @param {Number} rightBound 
         * @returns {Number} The line's col number sum
         */
        const getLineColSize = (leftBound, rightBound) => list.slice(leftBound + 1, rightBound).reduce((acc, current) => {
          // Simulates the layout
          const type = getType(current);
          // Simulates the layout
          const col = current.includes('long') ? 12 : getBootStrapCol(type);

          return acc += col;
        }, 0);
       
        // Retrieve the removed element default col
        const attrToRemoveIndex = action.index;
        const attrNameToRemove = getAttrName(attrToRemoveIndex);
        const attrToRemoveType = getType(attrNameToRemove);
        const attrToRemoveBootstrapCol = attrNameToRemove.includes('long') ? 12 : getBootStrapCol(attrToRemoveType);

        // TODO handle deleting the last visible element of line

        const arrayOfLastLineElements = [];
        let sum = 0;
        
        list.forEach((item, index) => {
          // Retrieve the item's bootstrap col
          // Simulates the layout that is not available in the core_store yet
          const itemType = item.includes('long') ? 'wysiwyg' : getType(item);
          const itemName = getAttrName(index);
          const itemColNumber = getBootStrapCol(itemType);  
          sum += itemColNumber;

          if (sum === 12 || itemColNumber === 12) {
            const isFullSize = itemColNumber === 12;
            arrayOfLastLineElements.push({ itemName, index, isFullSize });
            sum = 0;
          }

          if (sum > 12) {
            sum = 0;
          }
        });

         /**
         * 
         * @param {Bool} dir sup or min
         * @param {Number} pivot the center of 
         * @returns {Object} the first sup or last sup
         */
        const getBound = (dir, pivot = attrToRemoveIndex) => {
          let result = {};
          let hasResult = false;

          arrayOfLastLineElements.forEach(item => {
            const cond = dir === true ? item.index >= pivot && !hasResult : item.index <= pivot;

            if (cond) {
              hasResult = true;
              result = item;
            }
          });

          return result;
        };
        

        // Retrieve the removed element bounds
        const nodeBounds = { left: getBound(false), right: getBound(true) };
        const isRemovingAFullWidthNode = attrToRemoveBootstrapCol === 12;

        // If removing we need to add the corresponding missing col in the prev line
        if (isRemovingAFullWidthNode) {
          const currentNodeLine = findIndex(arrayOfLastLineElements, ['index', attrToRemoveIndex]);
          const previousLineBounds = { left: getBound(false, attrToRemoveIndex - 1), right: getBound(true, attrToRemoveIndex - 1) };
          const leftBoundIndex = get(previousLineBounds, ['left', 'index'], 0);
          const rightBoundIndex = get(previousLineBounds, ['right', 'index'], 0);
          const previousLineNumberOfItems = Math.abs(leftBoundIndex - rightBoundIndex) - 1;
          const previousLineColNumber = getLineColSize(leftBoundIndex, rightBoundIndex);
    

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

          let newList = list.delete(attrToRemoveIndex);

          if (colsToAdd.length > 1) {
            const newList = newList
              .insert(attrToRemoveIndex, colsToAdd[0])
              .insert(attrToRemoveIndex, colsToAdd[1]);
          } else {
            newList = newList.insert(attrToRemoveIndex, colsToAdd[0]);
          }

          return newList;
        } else {
          const leftBoundIndex = get(nodeBounds, ['left', 'index'], 0);
          const rightBoundIndex = get(nodeBounds, ['right', 'index'], 0);
          const currentLineColSize = getLineColSize(leftBoundIndex, rightBoundIndex);
          const isRemovingLine = currentLineColSize - attrToRemoveBootstrapCol === 0;

          if (isRemovingLine) {
            return list.delete(attrToRemoveIndex);
          }

          const lasLineIndexToAddCol = rightBoundIndex;
          // Else, just replace the right bound with the corresponding removed col number
          return list
            .delete(attrToRemoveIndex)
            .insert(lasLineIndexToAddCol, `col-md-${attrToRemoveBootstrapCol}`);
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
