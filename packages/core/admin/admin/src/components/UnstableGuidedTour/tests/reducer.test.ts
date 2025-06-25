import { type Action, reducer } from '../Context';

describe('GuidedTour | reducer', () => {
  describe('next_step', () => {
    it('should increment the step count for the specified tour', () => {
      const initialState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
        },
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentManager',
      };

      const expectedState = {
        tours: {
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when advancing a specific tour', () => {
      const initialState = {
        tours: {
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: 1,
          },
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: 1,
          },
        },
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentManager',
      };

      const expectedState = {
        tours: {
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: 1,
          },
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: 1,
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should mark tour as completed when reaching the last step', () => {
      const initialState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 1,
          },
        },
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentManager',
      };

      const expectedState = {
        tours: {
          contentManager: {
            currentStep: 1,
            isCompleted: true,
            length: 1,
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('skip_tour', () => {
    it('should mark the tour as completed', () => {
      const initialState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
        },
      };

      const action: Action = {
        type: 'skip_tour',
        payload: 'contentManager',
      };

      const expectedState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: 3,
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when skipping a specific tour', () => {
      const initialState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
        },
      };

      const action: Action = {
        type: 'skip_tour',
        payload: 'contentManager',
      };

      const expectedState = {
        tours: {
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: 3,
          },
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });
});
