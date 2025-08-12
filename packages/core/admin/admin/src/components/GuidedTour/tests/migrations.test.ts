import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';
import { migrateTourSteps, migrateTours } from '../utils/migrations';

import type { State } from '../Context';

describe('GuidedTour | migrateTourSteps', () => {
  it('should selectively update only tours with legacy length property', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          // @ts-expect-error legacy length property - should trigger migration
          length: 9,
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          isCompleted: false,
          // no length property - no migration
        },
        apiTokens: {
          currentStep: 3,
          // @ts-expect-error legacy length property - should trigger migration
          length: 8,
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 1,
          isCompleted: false,
          // no length property - no migration
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTourSteps(initialState);

    // Tours with length property should be reset but preserve isCompleted
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(0);
    expect(migratedState.tours.contentTypeBuilder.isCompleted).toBe(false);
    expect(migratedState.tours.contentTypeBuilder).not.toHaveProperty('length');

    expect(migratedState.tours.apiTokens.currentStep).toBe(0);
    expect(migratedState.tours.apiTokens.isCompleted).toBe(false);
    expect(migratedState.tours.apiTokens).not.toHaveProperty('length');

    // Tours without length property should remain unchanged
    expect(migratedState.tours.contentManager.currentStep).toBe(1);
    expect(migratedState.tours.contentManager.isCompleted).toBe(false);

    expect(migratedState.tours.strapiCloud.currentStep).toBe(1);
    expect(migratedState.tours.strapiCloud.isCompleted).toBe(false);
  });

  it('should preserve isCompleted when migrating tours with length property and filter tour-specific actions', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          // @ts-expect-error legacy length property - will trigger migration
          length: 7,
          isCompleted: true,
        },
        contentManager: {
          currentStep: 1,
          // @ts-expect-error legacy length property - will trigger migration
          length: 6,
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 3,
          // @ts-expect-error legacy length property - will trigger migration
          length: 4,
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          // @ts-expect-error legacy length property - will trigger migration
          length: 4,
          isCompleted: true,
        },
      },
      enabled: false,
      completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
    };

    const migratedState = migrateTourSteps(initialState);

    // currentStep should be reset to 0 for all tours with length property
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(0);
    expect(migratedState.tours.contentManager.currentStep).toBe(0);
    expect(migratedState.tours.apiTokens.currentStep).toBe(0);
    expect(migratedState.tours.strapiCloud.currentStep).toBe(0);

    // isCompleted should be preserved
    expect(migratedState.tours.contentTypeBuilder.isCompleted).toBe(true);
    expect(migratedState.tours.contentManager.isCompleted).toBe(false);
    expect(migratedState.tours.apiTokens.isCompleted).toBe(false);
    expect(migratedState.tours.strapiCloud.isCompleted).toBe(true);

    // Other state properties should be preserved
    expect(migratedState.enabled).toBe(false);
    // All tours were migrated, so all tour-specific actions should be removed
    expect(migratedState.completedActions).toEqual([]);

    // Length property should be removed from all migrated tours
    expect(migratedState.tours.contentTypeBuilder).not.toHaveProperty('length');
    expect(migratedState.tours.contentManager).not.toHaveProperty('length');
    expect(migratedState.tours.apiTokens).not.toHaveProperty('length');
    expect(migratedState.tours.strapiCloud).not.toHaveProperty('length');
  });

  it('should filter out tour-specific completed actions when migrating tours with length property', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          // @ts-expect-error legacy length property - will trigger migration
          length: 7,
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          isCompleted: false, // no length property - no migration
        },
        apiTokens: {
          currentStep: 0,
          isCompleted: false, // no length property - no migration
        },
        strapiCloud: {
          currentStep: 0,
          isCompleted: false, // no length property - no migration
        },
      },
      enabled: true,
      completedActions: [
        GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
        GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.addField,
        GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent,
        // @ts-expect-error test
        'someOtherAction', // non-tour action - should be preserved
      ],
    };

    const migratedState = migrateTourSteps(initialState);

    // contentTypeBuilder tour-specific actions should be removed since that tour was migrated
    expect(migratedState.completedActions).toEqual([
      GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent,
      'someOtherAction', // non-tour action preserved
    ]);

    // Verify the contentTypeBuilder tour was migrated and length property removed
    expect(migratedState.tours.contentTypeBuilder).not.toHaveProperty('length');
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(0);
    expect(migratedState.tours.contentTypeBuilder.isCompleted).toBe(false);
  });

  it('should not modify tours when they have no length property', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          isCompleted: false, // no length property
        },
        contentManager: {
          currentStep: 1,
          isCompleted: false, // no length property
        },
        apiTokens: {
          currentStep: 0,
          isCompleted: false, // no length property
        },
        strapiCloud: {
          currentStep: 0,
          isCompleted: false, // no length property
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTourSteps(initialState);

    // Should return the same state object since no changes were needed
    expect(migratedState).toBe(initialState);
  });
});

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
