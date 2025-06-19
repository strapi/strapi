import { type Action, reducer } from '../Context';

describe('GuidedTour | reducer', () => {
  describe('next_step', () => {
    it('should increment the step count for the specified tour', () => {
      const initialState = {
        currentSteps: {
          contentManager: 0,
        },
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentManager',
      };

      const expectedState = {
        currentSteps: {
          contentManager: 1,
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when advancing a specific tour', () => {
      const initialState = {
        currentSteps: {
          contentManager: 1,
          contentTypeBuilder: 2,
        },
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentManager',
      };

      const expectedState = {
        currentSteps: {
          contentManager: 2,
          contentTypeBuilder: 2,
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });
});
