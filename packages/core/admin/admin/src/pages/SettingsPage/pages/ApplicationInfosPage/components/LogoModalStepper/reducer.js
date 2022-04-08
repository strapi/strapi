/* eslint-disable consistent-return */
/*
 *
 * LogoModalStepper reducer
 *
 */

import produce from 'immer';

const initialState = {
  currentStep: 'upload',
  localImage: undefined,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GO_TO': {
        draftState.currentStep = action.to;
        break;
      }
      case 'SET_LOCAL_IMAGE': {
        draftState.localImage = action.value;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
