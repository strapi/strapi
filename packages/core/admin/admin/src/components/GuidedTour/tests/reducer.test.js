import reducer, { initialState } from '../reducer';

describe('Admin | Components | GuidedTour | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });
  describe('SET_CURRENT_STEP', () => {
    it('should update the currentStep', () => {
      const state = { ...initialState };

      const action = {
        type: 'SET_CURRENT_STEP',
        step: 'content-manager.create',
      };

      const expected = { ...initialState, currentStep: action.step };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
