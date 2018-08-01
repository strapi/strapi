/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import { difference, findIndex, flattenDeep, get, range, upperFirst } from 'lodash';
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
  addedElementName: null,
  draggedItemName: null,
  formValidations: List([]),
  initDragLine: -1,
  loading: true,
  modelEntries: 0,
  modifiedSchema: fromJS({}),
  hasMoved: false,
  hoverIndex: -1,
  schema: fromJS({}),
  shouldUpdateListOnDrop: true,
  submitSuccess: false,
});
const stateUpdater = (obj, array, keys) => obj.updateIn(['modifiedSchema', 'models', ...keys.split('.'), 'fields'], () => array);
const createManager = (obj, array, keys, dropIndex, layout) => new Manager(stateUpdater(obj, array, keys), array, keys, dropIndex, layout);
const getElementsOnALine = (manager, line) => {
  const firstElIndex = line === 0 ? 0 : manager.arrayOfEndLineElements[line - 1].index + 1;
  const lastElIndex = manager.arrayOfEndLineElements[line].index + 1;
  const elements = manager.getElementsOnALine(range(firstElIndex, lastElIndex));

  return { elements, lastElIndex };
};

function appReducer(state = initialState, action) {
  switch (action.type) {
    case BEGIN_MOVE:
      return state
        .update('draggedItemName', () => action.name);
    case EMPTY_STORE:
      return state;
    case END_MOVE:
      return state
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
          const shouldUpdateListOnDrop = state.get('shouldUpdateListOnDrop');
          const dropIndex = state.get('hoverIndex');
          const toAdd = state.get('draggedItemName');
          const initDragLine = state.get('initDragLine');
          const canDrop = list.indexOf(toAdd) === -1;
          const path = action.keys.split('.');
          const modelName = path.length > 2 ? path[2] : path[0];
          const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
          let newList = list;

          // We don't need to update the list onDrop for the full size elements since it's already handled by the MOVE_VARIABLE_ATTR
          if (shouldUpdateListOnDrop && canDrop) {
            newList = list
              .insert(dropIndex, toAdd);
        
            const addedElementName = state.get('addedElementName');
            const manager = createManager(state, newList, action.keys, dropIndex, layout);
            const arrayOfLastLineElements = manager.arrayOfEndLineElements;
            const nodeBound = manager.getBound(true);
            const dropLine = findIndex(arrayOfLastLineElements, ['index', nodeBound.index]);
            const addedElementIndex = newList.indexOf(addedElementName);

            // We need to remove the added element if dropping on the same line that the element was initially
            if (dropLine === initDragLine) {
              newList = newList.delete(addedElementIndex);
            }

            //Layout reorder
            const newManager = createManager(state, newList, action.keys, dropIndex, layout);
            const { elements: previousStateLineEls } = getElementsOnALine(createManager(state, list, action.keys, dropIndex, layout), dropLine);
            const { elements: currentStateLineEls } = getElementsOnALine(newManager, dropLine);

            if (dropLine !== initDragLine) {
              const diff = difference(previousStateLineEls, currentStateLineEls);
              const diffLineSize = newManager.getLineSize(diff);
              const lineToCreate = [...diff, ...manager.getColsToAdd(12 - diffLineSize)];
              let indexToInsert = dropIndex + 1;
  
              lineToCreate.forEach(item => {
                const canAdd = newList.indexOf(item) === -1;
  
                if (canAdd) {
                  newList = newList.insert(indexToInsert, item);
                }
                indexToInsert += 1;
              });
            }
            const nextManager = createManager(state, newList, action.keys, dropIndex, layout);
            const lastListItem = nextManager.getAttrInfos(newList.size - 1);
            const isLastItemFullSize = lastListItem.bootstrapCol === 12;
            const newArrayOfLastLineElements = nextManager.arrayOfEndLineElements
              .concat({ name: lastListItem.name, index: lastListItem.index, isFullSize: isLastItemFullSize });
            // Array of element's index to remove from the new list
            let addedElementsToRemove = [];

            newArrayOfLastLineElements.forEach((item, i) => {
              if (i < newArrayOfLastLineElements.length) {
                const firstElementOnLine = i === 0 ? 0 : newArrayOfLastLineElements[i - 1].index + 1;
                const lastElementOnLine = newArrayOfLastLineElements[i].index;
                const rangeIndex = range(firstElementOnLine, lastElementOnLine + 1);
                const elementsOnLine = nextManager.getElementsOnALine(rangeIndex)
                  .filter(name => !name.includes('__col'));

                if (elementsOnLine.length === 0) {
                  addedElementsToRemove = addedElementsToRemove.concat(rangeIndex);
                }
              }
            });

            newList = newList.filter((item, index) => { // Remove the unnecessary divs
              const indexToKeep = addedElementsToRemove.indexOf(index) === -1;

              return indexToKeep;
            });
            const lastManager = createManager(state, newList, action.keys, dropIndex, layout);
            const lastArrayOfLastLineElements = lastManager.arrayOfEndLineElements;
            const lines = [];
            lastArrayOfLastLineElements.forEach((item, i) => {
              const { elements } = getElementsOnALine(lastManager, i);
              lines.push(elements);
            });
            const reordered = lines.reduce((acc, curr) => {
              const line = curr.sort((a) => a.includes('__col-md'));
              
              return acc.concat(line);
            }, []);

            newList = List(flattenDeep(reordered));
          }


          return newList;
        })
        .update('draggedItemName', () => null)
        .update('hasMoved', () => false)
        .update('hoverIndex', () =>  -1)
        .update('shouldUpdateListOnDrop', () => true);
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
    case MOVE_VARIABLE_ATTR_EDIT_VIEW: {
      let updateHoverIndex = true;
      let shouldUpdateListOnDrop = state.get('shouldUpdateListOnDrop');
      let addedElementName = null;
      let initDragLine = state.get('initDragLine');

      return state
        .updateIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'fields'], list => {
          const draggedItemName = state.get('draggedItemName');
          const draggedItemIndex = list.indexOf(draggedItemName);
          const path = action.keys.split('.');
          const modelName = path.length > 2 ? path[2] : path[0];
          const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
          const manager = new Manager(state, list, action.keys, draggedItemIndex, layout);
          const arrayOfLastLineElements = manager.arrayOfEndLineElements;
          const itemInfos = manager.getAttrInfos(draggedItemIndex);
          const isFullSize = itemInfos.bootstrapCol === 12;
          const dropLineBounds = { left: manager.getBound(false, action.hoverIndex), right: manager.getBound(true, action.hoverIndex) };
          const hasMoved = state.get('hasMoved');
          
          if (isFullSize) {
            const upwards = action.dragIndex > action.hoverIndex;
            const indexToDrop = upwards ? get(dropLineBounds, 'left.index', 0) : get(dropLineBounds, 'right.index', list.size -1);
            updateHoverIndex = false;
            shouldUpdateListOnDrop = false;

            return list
              .delete(draggedItemIndex)
              .insert(indexToDrop, draggedItemName);
          }

          if (!hasMoved && !isFullSize) {
            const nodeBound = manager.getBound(true);
            const currentLine = findIndex(arrayOfLastLineElements, ['index', nodeBound.index]);
            initDragLine = currentLine;
            const random = Math.floor(Math.random() * 1000);
            const toAdd = `__col-md-${itemInfos.bootstrapCol}__${random}`;
            addedElementName = toAdd;

            return list
              .delete(action.dragIndex)
              .insert(action.dragIndex, toAdd);

          }

          return list;
        })
        .update('hoverIndex', () => {
          if (updateHoverIndex) {
            return action.hoverIndex;
          }

          return -1;
        })
        .update('addedElementName', name => {
          if (addedElementName) {
            return addedElementName;
          }
          
          return name;
        })
        .update('hasMoved', () => true)
        .update('initDragLine', () => initDragLine)
        .update('shouldUpdateListOnDrop', () => shouldUpdateListOnDrop);
    }
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
      return state.updateIn(['modifiedSchema', 'models', ...action.keys.split('.')], list => list.push(fromJS(action.data)));
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
        // Don't do any check if removing the last item of the array
        if (action.index === list.size - 1) {
          return list.delete(action.index);
        }
        const path = action.keys.split('.');
        const modelName = path.length > 2 ? path[2] : path[0];
        const layout = state.getIn(['modifiedSchema', 'layout', modelName, 'attributes']);
        const manager = new Manager(state, list, action.keys, action.index, layout);
        const attrToRemoveInfos = manager.attrToRemoveInfos; // Retrieve the removed item infos
        const arrayOfLastLineElements = manager.arrayOfEndLineElements;
        const isRemovingAFullWidthNode = attrToRemoveInfos.bootstrapCol === 12;
        let newList;
        
        if (isRemovingAFullWidthNode) { // If removing we need to add the corresponding missing col in the prev line
          const currentNodeLine = findIndex(arrayOfLastLineElements, ['index', attrToRemoveInfos.index]); // Used only to know if removing a full size element on the first line

          if (currentNodeLine === 0) {
            newList = list
              .delete(action.index);
          } else {
            const previousNodeLine = currentNodeLine - 1;
            const firstElementOnLine = previousNodeLine === 0 ? 0 : arrayOfLastLineElements[previousNodeLine - 1].index + 1;
            const lastElementOnLine = arrayOfLastLineElements[previousNodeLine].index + 1;
            const previousLineRangeIndexes = firstElementOnLine === lastElementOnLine ? [firstElementOnLine] : range(firstElementOnLine, lastElementOnLine);
            const elementsOnLine = manager.getElementsOnALine(previousLineRangeIndexes);
            const previousLineColNumber = manager.getLineSize(elementsOnLine);

            if (previousLineColNumber >= 10) {
              newList = list
                .delete(action.index);
            } else {
              const colNumberToAdd = 12 - previousLineColNumber;
              const colsToAdd = manager.getColsToAdd(colNumberToAdd);
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
          const nodeBounds = { left: manager.getBound(false), right: manager.getBound(true) }; // Retrieve the removed element's bounds
          const leftBoundIndex = get(nodeBounds, ['left', 'index'], 0) + 1;
          const rightBoundIndex = get(nodeBounds, ['right', 'index'], list.size -1);
          const elementsOnLine = manager.getElementsOnALine(range(leftBoundIndex - 1, rightBoundIndex + 1));
          const currentLineColSize = manager.getLineSize(elementsOnLine);
          const isRemovingLine = currentLineColSize - attrToRemoveInfos.bootstrapCol === 0;

          if (isRemovingLine) {
            newList = list
              .delete(attrToRemoveInfos.index);
          } else {
            const random = Math.floor(Math.random() * 1000); 
            newList = list
              .delete(attrToRemoveInfos.index)
              .insert(rightBoundIndex, `__col-md-${attrToRemoveInfos.bootstrapCol}__${random}`);
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
            const firstElementOnLine = i === 0 ? 0 : newArrayOfLastLineElements[i - 1].index + 1;
            const lastElementOnLine = newArrayOfLastLineElements[i].index;
            const rangeIndex = range(firstElementOnLine, lastElementOnLine + 1);
            const elementsOnLine = newManager.getElementsOnALine(rangeIndex)
              .filter(name => !name.includes('__col'));

            if (elementsOnLine.length === 0) {
              addedElementsToRemove = addedElementsToRemove.concat(rangeIndex);
            }
          }
        });

        newList = newList.filter((item, index) => { // Remove the unnecessary divs
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
      return state.update('modifiedSchema', () => state.get('schema'));
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
        const newList = manager.getLayout();

        // return list;
        return newList;
      });
    default:
      return state;
  }
}

export default appReducer;