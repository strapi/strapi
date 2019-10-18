/**
 *
 * settingViewModel reducer
 */

import { fromJS } from 'immutable';
import { formatLayout, getFieldType, getInputSize } from '../../utils/layout';

import {
  ADD_FIELD_TO_LIST,
  ADD_RELATION,
  GET_DATA_SUCCEEDED,
  MOVE_FIELD_LIST,
  MOVE_RELATION,
  MOVE_ROW,
  ON_ADD_DATA,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  REMOVE_FIELD,
  REMOVE_RELATION,
  REORDER_DIFF_ROW,
  REORDER_ROW,
  RESET_PROPS,
  SET_EDIT_FIELD_TO_SELECT,
  SET_LIST_FIELD_TO_EDIT_INDEX,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  initialData: {},
  isLoading: true,
  itemFormType: '',
  itemNameToSelect: '',
  listFieldToEditIndex: 0,
  modifiedData: {},
  shouldToggleModalSubmit: true,
});

function settingViewModelReducer(state = initialState, action) {
  const layoutPathEdit = ['modifiedData', 'layouts', 'edit'];
  const layoutPathRelations = ['modifiedData', 'layouts', 'editRelations'];
  const { dragIndex, hoverIndex, dragRowIndex, hoverRowIndex } = action;
  console.log(action.type);
  switch (action.type) {
    case ADD_FIELD_TO_LIST:
      return state.updateIn(['modifiedData', 'layouts', 'list'], list =>
        list.push(action.field)
      );
    case ADD_RELATION:
      return state
        .updateIn(layoutPathRelations, list => list.push(action.name))
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => getFieldType(state, action.name));
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => fromJS(action.layout || {}))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.layout || {}))
        .update('itemFormType', () => action.itemFormType)
        .update('itemNameToSelect', () => action.itemNameToSelect);
    case MOVE_FIELD_LIST:
      return state
        .updateIn(['modifiedData', 'layouts', 'list'], list => {
          return list
            .delete(action.dragIndex)
            .insert(action.overIndex, list.get(action.dragIndex));
        })
        .update('listFieldToEditIndex', () => {
          return action.overIndex;
        });
    case MOVE_RELATION: {
      return state.updateIn(layoutPathRelations, list => {
        return list
          .delete(dragIndex)
          .insert(hoverIndex, state.getIn([...layoutPathRelations, dragIndex]));
      });
    }
    case MOVE_ROW:
      return state.updateIn(layoutPathEdit, list => {
        return list
          .delete(dragRowIndex)
          .insert(
            hoverRowIndex,
            state.getIn([...layoutPathEdit, dragRowIndex])
          );
      });
    case ON_ADD_DATA: {
      const size = getInputSize(
        state.getIn([
          'modifiedData',
          'schema',
          'attributes',
          action.name,
          'type',
        ])
      );

      const listSize = state.getIn(layoutPathEdit).size;
      const newList = state
        .getIn(layoutPathEdit)
        .updateIn([listSize - 1, 'rowContent'], list => {
          if (list) {
            return list.push({
              name: action.name,
              size,
            });
          }

          return fromJS([{ name: action.name, size }]);
        });
      const formattedList = formatLayout(newList.toJS());

      return state
        .updateIn(layoutPathEdit, () => fromJS(formattedList))
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => getFieldType(state, action.name));
    }

    case ON_CHANGE:
      return state.updateIn(action.keys, () => action.value);
    case ON_REMOVE_LIST_FIELD: {
      const defaultSortByPath = ['modifiedData', 'settings', 'defaultSortBy'];
      const defaultSortBy = state.getIn(defaultSortByPath);
      const attrPath = ['modifiedData', 'layouts', 'list', action.index];
      const attrToBeRemoved = state.getIn(attrPath);

      const firstAttr = state.getIn(['modifiedData', 'layouts', 'list', 1]);

      return state
        .removeIn(['modifiedData', 'layouts', 'list', action.index])
        .update('listFieldToEditIndex', () => {
          if (action.index === state.get('listFieldToEditIndex')) {
            return 0;
          }

          return state.get('listFieldToEditIndex');
        })
        .updateIn(defaultSortByPath, () => {
          if (attrToBeRemoved === defaultSortBy) {
            return firstAttr;
          }

          return defaultSortBy;
        });
    }
    case ON_RESET:
      return state
        .update('modifiedData', () => state.get('initialData'))
        .update('listFieldToEditIndex', () => 0);
    case REMOVE_FIELD: {
      const row = state.getIn([
        ...layoutPathEdit,
        action.rowIndex,
        'rowContent',
      ]);
      let newState;
      let fieldName;

      // Delete the entire row if length is one or if lenght is equal to 2 and the second element is the hidden div used to make the dnd exp smoother
      if (
        row.size === 1 ||
        (row.size == 2 && row.getIn([1, 'name']) === '_TEMP_')
      ) {
        fieldName = state.getIn([
          ...layoutPathEdit,
          action.rowIndex,
          'rowContent',
          0,
          'name',
        ]);
        newState = state.updateIn(layoutPathEdit, list =>
          list.delete(action.rowIndex)
        );
      } else {
        fieldName = state.getIn([
          ...layoutPathEdit,
          action.rowIndex,
          'rowContent',
          action.fieldIndex,
          'name',
        ]);
        newState = state.updateIn(
          [...layoutPathEdit, action.rowIndex, 'rowContent'],
          list => list.delete(action.fieldIndex)
        );
      }
      const updatedList = fromJS(
        formatLayout(newState.getIn(layoutPathEdit).toJS())
      );

      if (state.get('itemNameToSelect') === fieldName) {
        const firstFieldEditToSelect = updatedList.getIn([
          0,
          'rowContent',
          0,
          'name',
        ]);
        const firstRelationFieldToSelect = state.getIn([
          ...layoutPathRelations,
          0,
        ]);
        const fieldToSelect =
          firstFieldEditToSelect || firstRelationFieldToSelect || '';
        const fieldToSelectType = getFieldType(state, fieldToSelect) || '';

        return state
          .updateIn(layoutPathEdit, () => updatedList)
          .update('itemNameToSelect', () => fieldToSelect)
          .update('itemFormType', () => fieldToSelectType);
      }

      return state.updateIn(layoutPathEdit, () => updatedList);
    }
    case REMOVE_RELATION: {
      let newState = state.updateIn(layoutPathRelations, list =>
        list.delete(action.index)
      );
      const fieldToDeleteName = state.getIn([
        ...layoutPathRelations,
        action.index,
      ]);

      if (state.get('itemNameToSelect') === fieldToDeleteName) {
        const firstRelation = newState.getIn([...layoutPathRelations, 0]);
        const firstEditField = newState.getIn([
          ...layoutPathEdit,
          '0',
          'rowContent',
          '0',
          'name',
        ]);
        const fieldToSelect = firstRelation || firstEditField || '';
        const fieldToSelectType = getFieldType(state, fieldToSelect) || '';

        newState = newState
          .update('itemNameToSelect', () => fieldToSelect)
          .update('itemFormType', () => fieldToSelectType);
      }

      return newState;
    }
    case REORDER_DIFF_ROW: {
      const newState = state
        .updateIn([...layoutPathEdit, dragRowIndex, 'rowContent'], list => {
          return list.remove(dragIndex);
        })
        .updateIn([...layoutPathEdit, hoverRowIndex, 'rowContent'], list => {
          return list.insert(
            hoverIndex,
            state.getIn([
              ...layoutPathEdit,
              dragRowIndex,
              'rowContent',
              dragIndex,
            ])
          );
        });

      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    case REORDER_ROW: {
      const newState = state.updateIn(
        [...layoutPathEdit, dragRowIndex, 'rowContent'],
        list => {
          return list.delete(dragIndex).insert(hoverIndex, list.get(dragIndex));
        }
      );

      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    case RESET_PROPS:
      return initialState;
    case SET_EDIT_FIELD_TO_SELECT:
      return state
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => action.fieldType);
    case SET_LIST_FIELD_TO_EDIT_INDEX:
      return state.update('listFieldToEditIndex', () => action.index);
    case SUBMIT_SUCCEEDED:
      return state
        .update('initialData', () => state.get('modifiedData'))
        .update('shouldToggleModalSubmit', v => !v);
    default:
      return state;
  }
}

export default settingViewModelReducer;
