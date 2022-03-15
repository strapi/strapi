/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  currentStep: null,
  guidedTourState: {
    contentTypeBuilder: {
      create: false,
      success: false,
    },
    contentManager: {
      create: false,
      success: false,
    },
    apiTokens: {
      create: false,
      success: false,
    },
  },
  isGuidedTourVisible: false,
  isSkipped: true,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_CURRENT_STEP': {
        draftState.currentStep = action.step;
        break;
      }
      case 'SET_STEP_STATE': {
        const [section, step] = action.currentStep.split('.');
        draftState.guidedTourState[section][step] = action.value;
        break;
      }
      case 'SET_SKIPPED': {
        draftState.isSkipped = action.value;
        break;
      }
      case 'SET_GUIDED_TOUR_VISIBILITY': {
        draftState.isGuidedTourVisible = action.value;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
