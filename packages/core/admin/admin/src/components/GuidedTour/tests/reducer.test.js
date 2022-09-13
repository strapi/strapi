import reducer, { initialState } from '../reducer';

describe('Admin | Components | GuidedTour | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SET_CURRENT_STEP', () => {
    it('should update currentStep', () => {
      const state = { ...initialState };

      const action = {
        type: 'SET_CURRENT_STEP',
        step: 'contentManager.create',
      };

      const expected = { ...initialState, currentStep: action.step };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });

  describe('SET_STEP_STATE', () => {
    it('should update guidedTourState', () => {
      const state = { ...initialState };

      const action = {
        type: 'SET_STEP_STATE',
        currentStep: 'contentTypeBuilder.create',
        value: true,
      };

      const guidedTourStateUpdated = {
        contentTypeBuilder: {
          create: true,
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
      };

      const expected = { ...initialState, guidedTourState: guidedTourStateUpdated };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });

  describe('SET_SKIPPED', () => {
    it('should skip the guidedTourState', () => {
      const state = { ...initialState };

      const skipped = true;

      const action = {
        type: 'SET_SKIPPED',
        value: skipped,
      };

      const updatedState = reducer(state, action);

      expect(updatedState.isSkipped).toEqual(skipped);
    });
  });

  describe('SET_GUIDED_TOUR_VISIBILITY', () => {
    it('should update isGuidedTourVisible', () => {
      const state = { ...initialState };

      const action = {
        type: 'SET_GUIDED_TOUR_VISIBILITY',
        value: true,
      };

      const expected = { ...initialState, isGuidedTourVisible: action.value };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
