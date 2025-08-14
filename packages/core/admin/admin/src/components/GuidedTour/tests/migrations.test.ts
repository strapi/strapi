import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';
import { migrateTours } from '../utils/migrations';

import type { State } from '../Context';

describe('GuidedTour | migrateTours', () => {
  it('should add new tours that are not in stored state', () => {
    const initialState: State = {
      // @ts-expect-error test
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false,
        },
        // Missing contentManager, apiTokens, and strapiCloud
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTours(initialState);

    // Should have all current tours
    expect(Object.keys(migratedState.tours)).toEqual(
      expect.arrayContaining(['contentTypeBuilder', 'contentManager', 'apiTokens', 'strapiCloud'])
    );

    // Existing tour should be preserved
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(2);
    expect(migratedState.tours.contentTypeBuilder.isCompleted).toBe(false);

    // New tours should be initialized properly
    expect(migratedState.tours.contentManager).toEqual({
      currentStep: 0,
      isCompleted: false,
    });
    expect(migratedState.tours.apiTokens).toEqual({
      currentStep: 0,
      isCompleted: false,
    });
    expect(migratedState.tours.strapiCloud).toEqual({
      currentStep: 0,
      isCompleted: false,
    });
  });

  it('should remove tours that no longer exist in current tours', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          isCompleted: true,
        },
        // @ts-expect-error - simulating removed tour
        removedTour: {
          currentStep: 3,
          isCompleted: false,
        },
        anotherRemovedTour: {
          currentStep: 0,
          isCompleted: true,
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTours(initialState);

    // Should only have current tours
    expect(Object.keys(migratedState.tours)).toEqual(
      expect.arrayContaining(['contentTypeBuilder', 'contentManager', 'apiTokens', 'strapiCloud'])
    );
    expect(Object.keys(migratedState.tours)).toHaveLength(4);

    // Should not have removed tours
    expect(migratedState.tours).not.toHaveProperty('removedTour');
    expect(migratedState.tours).not.toHaveProperty('anotherRemovedTour');

    // Existing valid tours should be preserved
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(2);
    expect(migratedState.tours.contentManager.currentStep).toBe(1);
    expect(migratedState.tours.contentManager.isCompleted).toBe(true);
  });

  it('should handle both additions and removals simultaneously', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false,
        },
        // Missing contentManager, apiTokens, strapiCloud (additions)
        // @ts-expect-error - simulating removed tour
        removedTour: {
          currentStep: 3,
          isCompleted: false,
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTours(initialState);

    // Should have exactly the current tours
    expect(Object.keys(migratedState.tours)).toEqual(
      expect.arrayContaining(['contentTypeBuilder', 'contentManager', 'apiTokens', 'strapiCloud'])
    );
    expect(Object.keys(migratedState.tours)).toHaveLength(4);

    // Existing tour should be preserved
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(2);

    // New tours should be added with proper initialization
    expect(migratedState.tours.contentManager).toEqual({
      currentStep: 0,
      isCompleted: false,
    });

    // Removed tour should not exist
    expect(migratedState.tours).not.toHaveProperty('removedTour');
  });

  it('should return state unchanged when tours are already synchronized', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          isCompleted: true,
        },
        apiTokens: {
          currentStep: 0,
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          isCompleted: false,
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTours(initialState);

    // Should have all tours with preserved state
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(2);
    expect(migratedState.tours.contentManager.currentStep).toBe(1);
    expect(migratedState.tours.contentManager.isCompleted).toBe(true);
    expect(migratedState.tours.apiTokens.currentStep).toBe(0);
    expect(migratedState.tours.strapiCloud.currentStep).toBe(0);

    // Should have exactly the current tours
    expect(Object.keys(migratedState.tours)).toEqual(
      expect.arrayContaining(['contentTypeBuilder', 'contentManager', 'apiTokens', 'strapiCloud'])
    );
    expect(Object.keys(migratedState.tours)).toHaveLength(4);
  });

  it('should preserve other state properties during migration', () => {
    const initialState: State = {
      // @ts-expect-error - simulating tours with only one tour
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false,
        },
      },
      enabled: false,
      completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
    };

    const migratedState = migrateTours(initialState);

    // Other state properties should be preserved
    expect(migratedState.enabled).toBe(false);
    expect(migratedState.completedActions).toEqual([
      GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
    ]);
  });
});
