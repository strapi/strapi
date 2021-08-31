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
  produce(state, drafState => {
    switch (action.type) {
      case RESET_PROPS: {
        drafState.currentLayout = null;
        break;
      }
      case SET_LAYOUT: {
        drafState.currentLayout = action.layout;
        break;
      }
      default:
        return drafState;
    }
  });

export default editViewManagerReducer;
