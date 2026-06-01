import { produce } from 'immer';

import { tours } from '../Tours';

import type { State, ValidTourName } from '../Context';

/**
 * Build default tour state (used when stored state is missing tours)
 */
const getDefaultTours = () =>
  (Object.keys(tours) as ValidTourName[]).reduce(
    (acc, tourName) => {
      acc[tourName] = { currentStep: 0, isCompleted: false, tourType: undefined };
      return acc;
    },
    {} as State['tours']
  );

/**
 * Migrates tours added or removed from the tours object.
 * Handles missing or corrupted stored state (e.g. old localStorage without `tours`).
 */
const migrateTours = (storedTourState: State) => {
  if (!storedTourState?.tours || typeof storedTourState.tours !== 'object') {
    return {
      ...storedTourState,
      tours: getDefaultTours(),
      enabled: storedTourState?.enabled ?? true,
      completedActions: Array.isArray(storedTourState?.completedActions)
        ? storedTourState.completedActions
        : [],
      hidden: storedTourState?.hidden ?? false,
    } as State;
  }

  const storedTourNames = Object.keys(storedTourState.tours) as ValidTourName[];
  const currentTourNames = Object.keys(tours) as ValidTourName[];

  return produce(storedTourState, (draft) => {
    // Add new tours that don't exist in stored state
    currentTourNames.forEach((tourName) => {
      if (!storedTourNames.includes(tourName)) {
        draft.tours[tourName] = {
          currentStep: 0,
          isCompleted: false,
          tourType: undefined,
        };
      }
    });

    // Remove tours that no longer exist in current tours
    storedTourNames.forEach((tourName) => {
      if (!currentTourNames.includes(tourName)) {
        delete draft.tours[tourName];
      }
    });
  });
};

export { migrateTours };
