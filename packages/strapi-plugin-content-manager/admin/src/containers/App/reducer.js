/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';
import { findIndex, get, pullAt, range, upperFirst } from 'lodash';
import Manager from 'utils/Manager';
import {
  BEGIN_MOVE,
  EMPTY_STORE,
  END_MOVE,
  GET_MODEL_ENTRIES_SUCCEEDED,
  LOAD_MODELS,
  LOADED_MODELS,
  MOVE_ATTR,
  MOVE_ATTR_EDIT_VIEW,
  MOVE_VARIABLE_ATTR_EDIT_VIEW,
  ON_CHANGE,
  ON_CHANGE_SETTINGS,
  ON_CLICK_ADD_ATTR,
  ON_CLICK_ADD_ATTR_FIELD,
  ON_REMOVE,
  ON_REMOVE_EDIT_VIEW_RELATION_ATTR,
  ON_REMOVE_EDIT_VIEW_FIELD_ATTR,
  ON_RESET,
  SET_LAYOUT,
  SUBMIT_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  draggedItemName: null,
  hasMoved: false,
  formValidations: List([]),
  loading: true,
  modelEntries: 0,
  modifiedSchema: fromJS({}),
  schema: fromJS({}),
  submitSuccess: false,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case BEGIN_MOVE:
      return state.update('draggedItemName', () => action.name);
    case EMPTY_STORE:
      return state;
    case END_MOVE:
      return state.update('hasMoved', () => false).update('draggedItemName', () => null);
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
          // const draggedItemName = state.get('draggedItemName');
          // const draggedItemIndex = list.indexOf(draggedItemName);
          // const path = action.keys.split('.');
          // const modelName = path.length > 2 ? path[2] : path[0];
          // const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
          // const manager = new Manager(state, list, action.keys, draggedItemIndex, layout);
          // const itemInfos = manager.getAttrInfos(draggedItemIndex);
          // const isFullSize = itemInfos.bootstrapCol === 12;
          
          // if (isFullSize) {
          //   const dropLineBounds = { left: manager.getBound(false, action.hoverIndex), right: manager.getBound(true, action.hoverIndex) };
          //   const indexToDrop = manager.getBound(true, action.hoverIndex).index + 1;
          // }

          return list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex));
        })
        .update('hasMoved', () => true);
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
    case ON_CLICK_ADD_ATTR_FIELD:
      return state
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.')], list => {
          return list.push(action.data);
        });
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
    case ON_REMOVE_EDIT_VIEW_FIELD_ATTR:
      return state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
        // Don't do any check if removing the item of the array
        if (action.index === list.size - 1) {
          return list.delete(action.index);
        }
        const path = action.keys.split('.');
        const modelName = path.length > 2 ? path[2] : path[0];
        const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
        const manager = new Manager(state, list, action.keys, action.index, layout);
        // Retrieve the removed element infos
        const attrToRemoveInfos = manager.attrToRemoveInfos;
        const arrayOfLastLineElements = manager.arrayOfEndLineElements;
        const isRemovingAFullWidthNode = attrToRemoveInfos.bootstrapCol === 12;

        let newList;
        
        // If removing we need to add the corresponding missing col in the prev line
        if (isRemovingAFullWidthNode) {
          const currentNodeLine = findIndex(arrayOfLastLineElements, ['index', attrToRemoveInfos.index]); // Used only to know if removing a full size element on the first line

          if (currentNodeLine === 0) {
            newList = list
              .delete(action.index);
          } else {
            const previousNodeLine = currentNodeLine - 1;
            const firstElementOnLine = previousNodeLine === 0 ? 0 : arrayOfLastLineElements[previousNodeLine - 1].index + 1;
            const lastElementOnLine = arrayOfLastLineElements[previousNodeLine].index + 1;
            const previousLineRangeIndexes = firstElementOnLine === lastElementOnLine ? [firstElementOnLine] : range(firstElementOnLine, lastElementOnLine);
            const elementsOnLine = pullAt(list.toJS(), previousLineRangeIndexes); // NOTE: Should be handled by the manager
            const previousLineColNumber = manager.getLineSize(elementsOnLine);

            if (previousLineColNumber >= 10) {
              newList = list
                .delete(action.index);
            } else {
              const colNumberToAdd = 12 - previousLineColNumber;
              const colsToAdd = (() => {
                switch(colNumberToAdd) {
                  case 9:
                    return ['__col-md-3__', '__col-md-6__'];
                  case 8:
                    return ['__col-md-4__', '__col-md-4__'];
                  case 6:
                    return ['__col-md-6__'];
                  default:
                    return ['__col-md-3__'];
                }
              })();

              newList = list
                .delete(attrToRemoveInfos.index)
                .insert(attrToRemoveInfos.index, colsToAdd[0]);
            
              if (colsToAdd.length > 1) {
                newList = newList
                  .insert(attrToRemoveInfos.index, colsToAdd[1]);
              }
            }
          }
        } else {
          // Retrieve the removed element bounds
          const nodeBounds = { left: manager.getBound(false), right: manager.getBound(true) }; // NOTE: could be refacto
          const leftBoundIndex = get(nodeBounds, ['left', 'index'], 0) + 1;
          const rightBoundIndex = get(nodeBounds, ['right', 'index'], list.size -1);
          const elementsOnLine = pullAt(list.toJS(), range(leftBoundIndex - 1, rightBoundIndex + 1)); // NOTE: Same here
          const currentLineColSize = manager.getLineSize(elementsOnLine);
          const isRemovingLine = currentLineColSize - attrToRemoveInfos.bootstrapCol === 0;

          if (isRemovingLine) {
            newList = list
              .delete(attrToRemoveInfos.index);
          } else {
            newList = list
              .delete(attrToRemoveInfos.index)
              .insert(rightBoundIndex, `__col-md-${attrToRemoveInfos.bootstrapCol}__`);
          }
        }

        // This part is needed to remove the add __col-md-${something}__ that keeps the layout when removing an item
        // It may happen that a line is composed by these divs therefore we need to remove then
        // It's the same logic than above so we're using the manager
        // NewState is the updated state
        const newState = state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], () => newList);
        const newManager = new Manager(newState, newList, action.keys, action.index, layout);
        const lastListItem = newManager.getAttrInfos(newList.size - 1);
        const isLastItemFullSize = lastListItem.bootstrapCol === 12;
        const newArrayOfLastLineElements = newManager.arrayOfEndLineElements
          .concat({ name: lastListItem.name, index: lastListItem.index, isFullSize: isLastItemFullSize });

        // Array of element's index to remove from the new list
        let addedElementsToRemove = [];

        newArrayOfLastLineElements.forEach((item, i) => {
          if (i < newArrayOfLastLineElements.length) {
            const firstElementOnLine = i === 0 ? 0 : newArrayOfLastLineElements[i - 1].index + 1; // NOTE: Should be a function
            const lastElementOnLine = newArrayOfLastLineElements[i].index;
            const rangeIndex = range(firstElementOnLine, lastElementOnLine + 1);
            const elementsOnLine = pullAt(newList.toJS(), rangeIndex)
              .filter(name => !name.includes('__col'));

            if (elementsOnLine.length === 0) {
              addedElementsToRemove = addedElementsToRemove.concat(rangeIndex);
            }
          }
        });

        newList = newList.filter((item, index) => {
          const indexToKeep = addedElementsToRemove.indexOf(index) === -1;

          return indexToKeep;
        });
        
        return newList;
      });
    case ON_REMOVE_EDIT_VIEW_RELATION_ATTR: {
      const relationName = state.getIn(['modifiedSchema', 'models', ...action.keys.split('.'), action.index]);

      return state
        .updateIn(['modifiedSchema', 'models', action.keys.split('.')[0], 'relations', relationName], relation => {
          return relation
            .update('description', () => '')
            .update('label', () => upperFirst(relation.get('alias')));
        })
        .updateIn(['modifiedSchema', 'models'].concat(action.keys.split('.')), list => {
          return list.delete(action.index);
        });
    }
    case ON_RESET:
      return state
        .update('modifiedSchema', () => state.get('schema'));
    case SUBMIT_SUCCEEDED:
      return state
        .update('submitSuccess', v => v = !v)
        .update('schema', () => state.get('modifiedSchema'));
    case SET_LAYOUT:
      return state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
        const path = action.keys.split('.');
        const modelName = path.length > 2 ? path[2] : path[0];
        const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
        const manager = new Manager(state, list, action.keys, 0, layout);

        let newList = list;
        let sum = 0;
        const arrayOfLastLineElements = manager.arrayOfEndLineElements;

        arrayOfLastLineElements.forEach((item, i) => { // NOTE: Should be refactored
          const firstLineItem = i === 0 ? 0 : arrayOfLastLineElements[i - 1].index +1;
          const lastLineItem = item.index + 1;
          const lineRange = firstLineItem === lastLineItem ? [firstLineItem] : range(firstLineItem, lastLineItem);
          const lineItems = pullAt(list.toJS(), lineRange);
          const lineSize = manager.getLineSize(lineItems);
          
          if (lineSize < 10 && i < arrayOfLastLineElements.length - 1) {
            const colsToAdd = manager.getColsToAdd(12 - lineSize);
            newList = newList.insert(lastLineItem + sum, colsToAdd[0]);
            
            if (colsToAdd.length > 1) {
              newList = newList.insert(lastLineItem + sum, colsToAdd[1]);
            }
            sum += 1;
            
          }
        });

        return newList;
      });

    default:
      return state;
  }
}

export default appReducer;