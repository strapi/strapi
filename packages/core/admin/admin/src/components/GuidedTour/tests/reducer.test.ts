import { type Action, type ExtendedCompletedActions, reducer } from '../Context';

describe('GuidedTour | reducer', () => {
  describe('next_step', () => {
    it('should increment the step count for the specified tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when advancing a specific tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: 1,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: 1,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 1,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: 1,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should mark tour as completed when reaching the last step', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 1,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'next_step',
        payload: 'contentTypeBuilder',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: true,
            length: 1,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 3,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 3,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other tour states when skipping a specific tour', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 3,
          },
          contentManager: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
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
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: ['didCreateContentTypeSchema', 'didCreateContent'] as ExtendedCompletedActions,
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCreateContent',
        ] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should merge actions with existing ones without duplicates', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
        ] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: ['didCreateContentTypeSchema', 'didCreateApiToken'] as ExtendedCompletedActions,
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
          'didCreateApiToken',
        ] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should handle empty payload gracefully', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: [] as ExtendedCompletedActions,
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve other state properties unchanged', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: true,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: false,
        completedActions: [] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'set_completed_actions',
        payload: ['didCopyApiToken'] as ExtendedCompletedActions,
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: true,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: false,
        completedActions: ['didCopyApiToken'] as ExtendedCompletedActions,
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
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: 2,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'skip_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 1,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: true,
            length: 2,
          },
          apiTokens: {
            currentStep: 2,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: false,
        completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should preserve completedActions array unchanged', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
          'didCreateApiToken',
        ] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'skip_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 2,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 3,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: false,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
          'didCreateApiToken',
        ] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });

  describe('reset_all_tours', () => {
    it('should reset when all tours have been completed', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 5,
            isCompleted: true,
            length: 5,
          },
          contentManager: {
            currentStep: 4,
            isCompleted: true,
            length: 4,
          },
          apiTokens: {
            currentStep: 4,
            isCompleted: true,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: true,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
          'didCreateApiToken',
        ] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 5,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should reset when some tours have been completed', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 2,
            isCompleted: false,
            length: 5,
          },
          contentManager: {
            currentStep: 4,
            isCompleted: true,
            length: 4,
          },
          apiTokens: {
            currentStep: 1,
            isCompleted: false,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 5,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });

    it('should reset when tour is disabled', () => {
      const initialState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 3,
            isCompleted: false,
            length: 5,
          },
          contentManager: {
            currentStep: 2,
            isCompleted: false,
            length: 4,
          },
          apiTokens: {
            currentStep: 4,
            isCompleted: true,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: false,
        completedActions: [
          'didCreateContentTypeSchema',
          'didCopyApiToken',
        ] as ExtendedCompletedActions,
      };

      const action: Action = {
        type: 'reset_all_tours',
      };

      const expectedState = {
        tours: {
          contentTypeBuilder: {
            currentStep: 0,
            isCompleted: false,
            length: 5,
          },
          contentManager: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          apiTokens: {
            currentStep: 0,
            isCompleted: false,
            length: 4,
          },
          strapiCloud: {
            currentStep: 0,
            isCompleted: false,
            length: 0,
          },
        },
        enabled: true,
        completedActions: [] as ExtendedCompletedActions,
      };

      expect(reducer(initialState, action)).toEqual(expectedState);
    });
  });
});
