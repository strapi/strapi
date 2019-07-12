/**
 *
 * settingViewModel reducer
 */

import { fromJS } from 'immutable';
import {
  ADD_FIELD_TO_LIST,
  GET_DATA_SUCCEEDED,
  MOVE_FIELD_LIST,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  RESET_PROPS,
  SET_LIST_FIELD_TO_EDIT_INDEX,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  listFieldToEditIndex: 0,
  initialData: fromJS({}),
  isLoading: true,
  modifiedData: fromJS({}),
  shouldToggleModalSubmit: true,
});

function settingViewModelReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_FIELD_TO_LIST:
      return state.updateIn(['modifiedData', 'layouts', 'list'], list =>
        list.push(action.field)
      );
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => fromJS(action.layout))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.layout));
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
