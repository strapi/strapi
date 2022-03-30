/* eslint-disable consistent-return */
/*
 *
 * ConfigurationsProvider reducer
 *
 */

import produce from 'immer';

const initialState = {
  logos: {
    menu: null,
  },
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_CUSTOM_LOGO': {
        draftState.logos[action.logoType] = action.value;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
