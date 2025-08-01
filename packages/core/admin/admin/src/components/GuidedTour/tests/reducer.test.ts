import { type Action, type CompletedActions, reducer } from '../Context';
import { tours } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';

describe('GuidedTour | reducer', () => {
  describe('next_step', () => {
    it('should increment the step count for the specified tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when advancing a specific tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should mark tour as completed when reaching the last step', () => {
      const tourLength = Object.keys(tours.contentTypeBuilder).length;
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: tourLength - 1,
            isCompleted: false,
            length: tourLength,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: tourLength,
            isCompleted: true,
            length: tourLength,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('skip_tour', () => {
    it('should mark the tour as completed', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'skip_tour',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: true,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when skipping a specific tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'skip_tour',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: true,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('set_completed_actions', () => {
    it('should add new actions to empty completedActions array', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent,
        ],
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent,
        ],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should merge actions with existing ones without duplicates', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
        ],
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.createToken,
        ],
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.createToken,
        ],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should handle empty payload gracefully', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: [],
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other state properties unchanged', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: true,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: false,
        completedActions: [],
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken],
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: true,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: false,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('skip_all_tours', () => {
    it('should set enabled to false while preserving tours state', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      };

      const action: Action = {
        type: 'skip_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: false,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve completedActions array unchanged', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.createToken,
        ],
      };

      const action: Action = {
        type: 'skip_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: false,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.createToken,
        ],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('reset_all_tours', () => {
    it('should reset all tours', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 8,
            isCompleted: true,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 4,
            isCompleted: true,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 4,
            isCompleted: true,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: true,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.createToken,
        ],
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should reset when some tours have been completed', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 4,
            isCompleted: true,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should reset when tour is disabled', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 3,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 4,
            isCompleted: true,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: false,
        completedActions: [
          GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken,
        ],
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('previous_step', () => {
    it('should decrement the step count for the specified tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'previous_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should not decrement below 0', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      const action: Action = {
        type: 'previous_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentTypeBuilder).length,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.contentManager).length,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.apiTokens).length,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: Object.keys(tours.strapiCloud).length,
          },
        },
        enabled: true,
        completedActions: [],
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });
});
