/* eslint-disable consistent-return */
/*
 *
 * ApplicationInfosPage Form reducer
 *
 */

import produce from 'immer';

const initialState = {
  menuLogo: {
    display: null,
    submit: {
      rawFile: null,
      isReset: false,
    },
  },
  authLogo: {
    display: null,
    submit: {
      rawFile: null,
      isReset: false,
    },
  },
};

const reducer = (state = initialState, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_CUSTOM_MENU_LOGO': {
        draftState.menuLogo.display = action.value;
        draftState.menuLogo.submit.rawFile = action.value.rawFile;
        break;
      }
      case 'SET_CUSTOM_AUTH_LOGO': {
        draftState.authLogo.display = action.value;
        draftState.authLogo.submit.rawFile = action.value.rawFile;
        break;
      }
      case 'RESET_CUSTOM_MENU_LOGO': {
        draftState.menuLogo.display = null;
        draftState.menuLogo.submit = {
          rawFile: null,
          isReset: true,
        };
        break;
      }
      case 'RESET_CUSTOM_AUTH_LOGO': {
        draftState.authLogo.display = null;
        draftState.authLogo.submit = {
          rawFile: null,
          isReset: true,
        };
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
