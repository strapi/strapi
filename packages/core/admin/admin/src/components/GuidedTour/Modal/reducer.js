/* eslint-disable consistent-return */
import produce from 'immer';

export const initialState = {
  stepContent: null,
  sectionIndex: null,
  stepIndex: null,
  hasSectionAfter: false,
  hasStepAfter: false,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'UPDATE_MODAL': {
        draftState.stepContent = action.content;
        draftState.sectionIndex = action.newSectionIndex;
        draftState.stepIndex = action.newStepIndex;
        draftState.hasSectionAfter = action.newHasSectionAfter;
        draftState.hasStepAfter = action.newHasStepAfter;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
