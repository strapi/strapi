/* eslint-disable consistent-return */
/*
 *
 * LogoInput reducer
 *
 */

import produce from 'immer';

const initialState = {
  currentStep: undefined,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GO_TO': {
        draftState.currentStep = action.to;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
