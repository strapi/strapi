/* eslint-disable consistent-return */
/*
 *
 * LogoModalStepper reducer
 *
 */

import produce from 'immer';

const initialState = {
  localImage: undefined,
};

const reducer = (state = initialState, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
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
