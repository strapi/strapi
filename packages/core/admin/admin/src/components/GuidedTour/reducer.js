/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  currentStep: null,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_STEP': {
        // console.log(action, state, draftState);
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
