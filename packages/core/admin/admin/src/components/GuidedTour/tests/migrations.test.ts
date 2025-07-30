import { tours } from '../Tours';
import { migrateTourLengths } from '../utils/migrations';

import type { ExtendedCompletedActions, State } from '../Context';

describe('GuidedTour | migrateTourLengths', () => {
  it('should update tour lengths to match current tours definition', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: 3,
          isCompleted: false,
        },
        contentManager: {
          currentStep: 1,
          length: 2,
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 0,
          length: 2,
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          length: 1,
          isCompleted: false,
        },
      },
      enabled: true,
      completedActions: [] as ExtendedCompletedActions,
    };

    const migratedState = migrateTourLengths(initialState);

    expect(migratedState.tours.contentTypeBuilder.length).toBe(
      Object.keys(tours.contentTypeBuilder).length
    );
    expect(migratedState.tours.contentManager.length).toBe(
      Object.keys(tours.contentManager).length
    );
    expect(migratedState.tours.apiTokens.length).toBe(Object.keys(tours.apiTokens).length);
    expect(migratedState.tours.strapiCloud.length).toBe(Object.keys(tours.strapiCloud).length);
  });

  it('should preserve other tour properties', () => {
    const initialState: State = {
      tours: {
        contentTypeBuilder: {
          currentStep: 2,
          length: 5,
          isCompleted: true,
        },
        contentManager: {
          currentStep: 1,
          length: 3,
          isCompleted: false,
        },
        apiTokens: {
          currentStep: 3,
          length: 4,
          isCompleted: false,
        },
        strapiCloud: {
          currentStep: 0,
          length: 2,
          isCompleted: true,
        },
      },
      enabled: false,
      completedActions: ['didCreateContentTypeSchema'] as ExtendedCompletedActions,
    };

    const migratedState = migrateTourLengths(initialState);

    expect(migratedState.tours.contentTypeBuilder.currentStep).toBe(2);
    expect(migratedState.tours.contentTypeBuilder.isCompleted).toBe(true);
    expect(migratedState.tours.contentManager.currentStep).toBe(1);
    expect(migratedState.tours.contentManager.isCompleted).toBe(false);
    expect(migratedState.tours.apiTokens.currentStep).toBe(3);
    expect(migratedState.tours.apiTokens.isCompleted).toBe(false);
    expect(migratedState.tours.strapiCloud.currentStep).toBe(0);
    expect(migratedState.tours.strapiCloud.isCompleted).toBe(true);
    expect(migratedState.enabled).toBe(false);
    expect(migratedState.completedActions).toEqual(['didCreateContentTypeSchema']);
  });
});
