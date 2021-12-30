/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  currentStep: null,
  guidedTourState: {
    contentTypeBuilder: {
      create: {
        closed: false,
      },
      success: {
        closed: false,
      },
    },
    contentManager: {
      create: {
        closed: false,
      },
      success: {
        closed: false,
      },
    },
    apiTokens: {
      create: {
        closed: false,
      },
      success: {
        closed: false,
      },
    },
  },
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_CURRENT_STEP': {
        draftState.currentStep = action.step;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
