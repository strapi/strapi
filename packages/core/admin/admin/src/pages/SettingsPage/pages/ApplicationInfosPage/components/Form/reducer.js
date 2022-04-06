/* eslint-disable consistent-return */
/*
 *
 * ApplicationInfosPage Form reducer
 *
 */

import produce from 'immer';

const initialState = {
  customMenuLogo: null,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_CUSTOM_MENU_LOGO': {
        draftState.customMenuLogo = action.value;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
