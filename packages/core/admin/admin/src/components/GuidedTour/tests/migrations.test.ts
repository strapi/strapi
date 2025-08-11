import { tours } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';
import { migrateTourSteps } from '../utils/migrations';

import type { State } from '../Context';

describe('GuidedTour | migrateTourSteps', () => {
  it('should selectively update only tours with changed lengths', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: 9, // stale length - should trigger migration
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          length: Object.keys(tours.contentManager).length, // Correct length - no migration
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 3,
          length: 8, // stale length - should trigger migration
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 1,
          length: Object.keys(tours.strapiCloud).length, // Correct length - no migration
          isCompleted: false,
        },
      },
      enabled: true,
      completedActions: [],
    };

    const migratedState = migrateTourSteps(initialState);

    // Tours with stale lengths should be updated
    expect(migratedState.tours.contentTypeBuilder.length).toBe(
      Object.keys(tours.contentTypeBuilder).length
    );
    expect(migratedState.tours.apiTokens.length).toBe(Object.keys(tours.apiTokens).length);

    // Tours with correct lengths should remain unchanged
    expect(migratedState.tours.contentManager.length).toBe(
      Object.keys(tours.contentManager).length
    );
    expect(migratedState.tours.strapiCloud.length).toBe(Object.keys(tours.strapiCloud).length);

    // currentStep should be reset to 0 only for tours that were migrated
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(0); // Was migrated
    expect(migratedState.tours.apiTokens.currentStep).toBe(0); // Was migrated

    // currentStep should be preserved for tours that were not migrated
    expect(migratedState.tours.contentManager.currentStep).toBe(1); // Not migrated
    expect(migratedState.tours.strapiCloud.currentStep).toBe(1); // Not migrated
  });

  it('should preserve isCompleted and enabled when migrating, but filter tour-specific actions', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: 7, // Outdated length - will trigger migration
          isCompleted: true,
        },
        contentManager: {
          currentStep: 1,
          length: 6, // Outdated length - will trigger migration
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 3,
          length: 4, // Outdated length - will trigger migration
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          length: 4, // Outdated length - will trigger migration
          isCompleted: true,
        },
      },
      enabled: false,
      completedActions: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
    };

    const migratedState = migrateTourSteps(initialState);

    // currentStep should be reset to 0 for all tours (since all had wrong lengths)
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
    // contentTypeBuilder was migrated, so its actions should be removed
    expect(migratedState.completedActions).toEqual([]);

    // Lengths should be updated to correct values
    expect(migratedState.tours.contentTypeBuilder.length).toBe(
      Object.keys(tours.contentTypeBuilder).length
    );
    expect(migratedState.tours.contentManager.length).toBe(
      Object.keys(tours.contentManager).length
    );
    expect(migratedState.tours.apiTokens.length).toBe(Object.keys(tours.apiTokens).length);
    expect(migratedState.tours.strapiCloud.length).toBe(Object.keys(tours.strapiCloud).length);
  });

  it('should filter out tour-specific completed actions when migrating tours', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: 7, // Outdated length - will trigger migration
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          length: Object.keys(tours.contentManager).length, // Correct length - no migration
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 0,
          length: Object.keys(tours.apiTokens).length, // Correct length - no migration
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          length: Object.keys(tours.strapiCloud).length, // Correct length - no migration
          isCompleted: false,
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

    // Verify the contentTypeBuilder tour was actually migrated
    expect(migratedState.tours.contentTypeBuilder.length).toBe(
      Object.keys(tours.contentTypeBuilder).length
    );
    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(0);
  });

  it('should not modify tours when their lengths match current definitions', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: Object.keys(tours.contentTypeBuilder).length, // Matches current tour length
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          length: Object.keys(tours.contentManager).length, // Matches current tour length
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 0,
          length: Object.keys(tours.apiTokens).length, // Matches current tour length
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          length: Object.keys(tours.strapiCloud).length, // Matches current tour length
          isCompleted: false,
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
