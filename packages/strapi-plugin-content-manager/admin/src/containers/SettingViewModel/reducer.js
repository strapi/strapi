/**
 *
 * settingViewModel reducer
 */

import { fromJS } from 'immutable';
import { formatLayout } from '../../utils/layout';

import {
  ADD_FIELD_TO_LIST,
  FORMAT_LAYOUT,
  GET_DATA_SUCCEEDED,
  MOVE_FIELD_LIST,
  MOVE_ROW,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  REORDER_DIFF_ROW,
  REORDER_ROW,
  RESET_PROPS,
  SET_LIST_FIELD_TO_EDIT_INDEX,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  didDrop: false,
  listFieldToEditIndex: 0,
  initialData: fromJS({}),
  isLoading: true,
  modifiedData: fromJS({}),
  shouldToggleModalSubmit: true,
});

function settingViewModelReducer(state = initialState, action) {
  const layoutPath = ['modifiedData', 'layouts', 'edit'];
  const { dragIndex, hoverIndex, dragRowIndex, hoverRowIndex } = action;

  switch (action.type) {
    case ADD_FIELD_TO_LIST:
      return state.updateIn(['modifiedData', 'layouts', 'list'], list =>
        list.push(action.field)
      );
    case FORMAT_LAYOUT: {
      const newList = formatLayout(state.getIn(layoutPath).toJS());

      return state.updateIn(layoutPath, () => fromJS(newList));
    }
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => fromJS(action.layout || {}))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.layout || {}));
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
    case MOVE_ROW:
      return state.updateIn(layoutPath, list => {
        return list
          .delete(dragRowIndex)
          .insert(hoverRowIndex, state.getIn([...layoutPath, dragRowIndex]));
      });

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
    case REORDER_DIFF_ROW:
      return state
        .updateIn([...layoutPath, dragRowIndex, 'rowContent'], list => {
          return list.remove(dragIndex);
        })
        .updateIn([...layoutPath, hoverRowIndex, 'rowContent'], list => {
          return list.insert(
            hoverIndex,
            state.getIn([...layoutPath, dragRowIndex, 'rowContent', dragIndex])
          );
        })
        .update('didDrop', v => !v);
    case REORDER_ROW:
      return state
        .updateIn([...layoutPath, dragRowIndex, 'rowContent'], list => {
          return list.delete(dragIndex).insert(hoverIndex, list.get(dragIndex));
        })
        .update('didDrop', v => !v);
    case RESET_PROPS:
      return initialState;
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
