/* eslint-disable consistent-return */
/*
 *
 * ConfigurationsProvider reducer
 *
 */

import produce from 'immer';

const initialState = {
  customMenuLogo: null,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_CUSTOM_LOGO': {
        if (action.logo !== undefined && draftState[action.logoType] !== undefined) {
          draftState[action.logoType] = action.logo;
        }
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
