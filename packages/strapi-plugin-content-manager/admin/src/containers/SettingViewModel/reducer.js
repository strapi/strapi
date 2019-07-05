/**
 *
 * settingViewModel reducer
 */

import { fromJS } from 'immutable';
import {
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  RESET_PROPS,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  initialData: fromJS({}),
  isLoading: true,
  modifiedData: fromJS({}),
  shouldToggleModalSubmit: true,
});

function settingViewModelReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => fromJS(action.layout))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.layout));
    case ON_CHANGE:
      return state.updateIn(action.keys, () => action.value);
    case ON_REMOVE_LIST_FIELD: {
      const defaultSortByPath = ['modifiedData', 'settings', 'defaultSortBy'];
      const defaultSortBy = state.getIn(defaultSortByPath);
      const attrPath = ['modifiedData', 'layouts', 'list', action.index];
      const attrToBeRemoved = state.getIn(attrPath);

      if (attrToBeRemoved === defaultSortBy) {
        const firstAttr = state.getIn(['modifiedData', 'layouts', 'list', 1]);

        return state
          .removeIn(['modifiedData', 'layouts', 'list', action.index])
          .updateIn(defaultSortByPath, () => firstAttr);
      }

      return state.removeIn(['modifiedData', 'layouts', 'list', action.index]);
    }
    case ON_RESET:
      return state.update('modifiedData', () => state.get('initialData'));
    case RESET_PROPS:
      return initialState;
    case SUBMIT_SUCCEEDED:
      return state
        .update('initialData', () => state.get('modifiedData'))
        .update('shouldToggleModalSubmit', v => !v);
    default:
      return state;
  }
}

export default settingViewModelReducer;
