/**
 *
 * EditViewLayoutManager reducer
 */

import produce from 'immer';

import { RESET_PROPS, SET_LAYOUT } from './constants';

export const initialState = {
  currentLayout: null,
};

const editViewManagerReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case RESET_PROPS: {
        draftState.currentLayout = null;
        break;
      }
      case SET_LAYOUT: {
        draftState.currentLayout = action.layout;
        break;
      }
      default:
        return draftState;
    }
  });

export default editViewManagerReducer;
