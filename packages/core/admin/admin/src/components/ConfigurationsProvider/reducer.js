/* eslint-disable consistent-return */
/*
 *
 * ConfigurationsProvider reducer
 *
 */

import produce from 'immer';

const initialState = {
  menuLogo: {
    logo: undefined,
    isCustom: false,
  },
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'CHANGE_LOGO': {
        if (draftState[action.logoType]) {
          draftState[action.logoType] = { logo: action.logo, isCustom: action.isCustom };
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
