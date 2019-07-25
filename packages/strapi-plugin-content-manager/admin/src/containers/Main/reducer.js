/**
 *
 * main reducer
 */

import { fromJS } from 'immutable';
import {
  DELETE_LAYOUT,
  DELETE_LAYOUTS,
  GET_DATA_SUCCEEDED,
  GET_LAYOUT_SUCCEEDED,
  ON_CHANGE_LIST_LABELS,
  RESET_LIST_LABELS,
} from './constants';

export const initialState = fromJS({
  groupsAndModelsMainPossibleMainFields: {},
  groups: [],
  initialLayouts: {},
  isLoading: true,
  layouts: {},
  models: [],
});

function mainReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_LAYOUT:
      return state.removeIn(['layouts', action.uid]);
    case DELETE_LAYOUTS:
      return state.update('layouts', () => fromJS({}));
    case GET_DATA_SUCCEEDED:
      return state
        .update('groups', () => fromJS(action.groups))
        .update('models', () => fromJS(action.models))
        .update('groupsAndModelsMainPossibleMainFields', () =>
          fromJS(action.mainFields)
        )
        .update('isLoading', () => false);
    case GET_LAYOUT_SUCCEEDED:
      return state
        .updateIn(['layouts', action.uid], () => fromJS(action.layout))
        .updateIn(['initialLayouts', action.uid], () => fromJS(action.layout));
    case ON_CHANGE_LIST_LABELS: {
      const {
        keys: [slug, label],
        value,
      } = action;

      return state.updateIn(['layouts', slug, 'layouts', 'list'], list => {
        if (value) {
          return list.push(label);
        }

        return list.filter(l => l !== label);
      });
    }
    case RESET_LIST_LABELS:
      return state.updateIn(['layouts', action.slug], () =>
        state.getIn(['initialLayouts', action.slug])
      );
    default:
      return state;
  }
}

export default mainReducer;
