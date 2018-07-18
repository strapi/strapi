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
        const getType = (itemName) =>
          state.getIn(['modifiedSchema', 'models', ...action.keys.split('.'), 'availableFields', itemName, 'type']);
        
        let sum = 0;
        let indexToAddBreak = null;

        list.forEach((item, i) => {
          const type = item === 'w-100' ? 'wysiwyg' : getType(item);
          const colNumber = item.includes('long') ? 12 : getBootStrapCol(type);
          sum += colNumber;

          // Removing the last element of a line
          if ((sum === 12 || colNumber === 12) && i === action.index) {
            sum = 0;
            indexToAddBreak = i;
          }

          if (sum >= 12) {
            sum = 0;
          }

          // Don't check if we already solved indexToAddBreak
          if (i < list.size -1 && !indexToAddBreak) {
            const nextItem = list.get(i + 1);
            // Col-12
            const nextType = nextItem === 'w-100' ? 'wysiwyg' : getType(nextItem);
            // Simulates the layout
            const nextColNumber = nextItem.includes('long') ? 12 : getBootStrapCol(nextType);

            // Add a line break to the nearest node
            if (sum + nextColNumber >= 12 && i + 1 > action.index) {
              sum = 0;
              indexToAddBreak = i + 1;
            }
          }

        });

        let newList = list.delete(action.index);

        if (indexToAddBreak && indexToAddBreak !== -1 && action.index !== list.size - 1) {
          newList = newList.insert(indexToAddBreak, 'w-100');
        }

        return newList.filter((a, i) => {
          // Remove the uneeded line break
          if (i === 0 && a === 'w-100') {
            return false;
          }
          // Delete same elements that are in order
          return newList.get(i - 1) !== a;
        });
          
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
