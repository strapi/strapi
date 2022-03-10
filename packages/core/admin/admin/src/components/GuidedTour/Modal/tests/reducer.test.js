import reducer, { initialState } from '../reducer';

describe('Admin | Components | GuidedTour | Modal | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('UPDATE_MODAL', () => {
    it('should update the modal state', () => {
      const state = { ...initialState };

      const newState = {
        content: 'Test',
        newSectionIndex: 'Test',
        newStepIndex: 'Test',
        newHasSectionAfter: true,
        newHasStepAfter: true,
      };

      const expected = {
        stepContent: newState.content,
        sectionIndex: newState.newSectionIndex,
        stepIndex: newState.newStepIndex,
        hasSectionAfter: newState.newHasSectionAfter,
        hasStepAfter: newState.newHasStepAfter,
      };

      const action = {
        type: 'UPDATE_MODAL',
        ...newState,
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
