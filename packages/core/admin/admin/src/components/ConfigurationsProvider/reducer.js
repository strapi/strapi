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
        draftState[action.logoType].logo = action.logo;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
