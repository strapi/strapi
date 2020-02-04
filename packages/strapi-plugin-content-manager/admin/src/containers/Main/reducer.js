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
  RESET_PROPS,
} from './constants';

export const initialState = fromJS({
  componentsAndModelsMainPossibleMainFields: {},
  components: [],
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
        .update('components', () => fromJS(action.components))
        .update('models', () => fromJS(action.models))
        .update('componentsAndModelsMainPossibleMainFields', () =>
          fromJS(action.mainFields)
        )
        .update('isLoading', () => false);
    case GET_LAYOUT_SUCCEEDED:
      return state
        .updateIn(['layouts', action.uid], () => fromJS(action.layout))
        .updateIn(['initialLayouts', action.uid], () => fromJS(action.layout));
    case ON_CHANGE_LIST_LABELS: {
      const { name, slug, value } = action;

      return state.updateIn(
        ['layouts', slug, 'contentType', 'layouts', 'list'],
        list => {
          if (value) {
            return list.push(name);
          }

          return list.filter(l => l !== name);
        }
      );
    }
    case RESET_LIST_LABELS:
      return state.updateIn(['layouts', action.slug], () =>
        state.getIn(['initialLayouts', action.slug])
      );
    case RESET_PROPS:
      return initialState;
    default:
      return state;
  }
}

export default mainReducer;
