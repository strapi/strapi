import { produce } from 'immer';

import { tours } from '../Tours';

import { GUIDED_TOUR_REQUIRED_ACTIONS } from './constants';

import type { State, ValidTourName } from '../Context';

/**
 * Migrates steps added or removed from any tour in the tours object
 *
 * NOTE: This will only happen once when the user migrates from a version that stored the "length"
 * property in local storage. We no longer store this in local storage.
 */
const migrateTourSteps = (storedTourState: State) => {
  const storedTourNames = Object.keys(storedTourState.tours) as ValidTourName[];

  return produce(storedTourState, (draft) => {
    storedTourNames.forEach((tourName) => {
      const storedState = storedTourState.tours[tourName];

      if ('length' in storedState) {
        draft.tours[tourName] = {
          // Maintain the isComplete state, but reset everything else for this tour
          isCompleted: storedTourState.tours[tourName].isCompleted,
          currentStep: 0,
        };
        draft.completedActions = draft.completedActions.filter(
          (action) => !Object.values(GUIDED_TOUR_REQUIRED_ACTIONS[tourName]).includes(action)
        );
      }
    });
  });
};

/**
 * Migrates tours added or removed from the tours object
 */
const migrateTours = (storedTourState: State) => {
  const storedTourNames = Object.keys(storedTourState.tours) as ValidTourName[];
  const currentTourNames = Object.keys(tours) as ValidTourName[];

  return produce(storedTourState, (draft) => {
    // Add new tours that don't exist in stored state
    currentTourNames.forEach((tourName) => {
      if (!storedTourNames.includes(tourName)) {
        draft.tours[tourName] = {
          currentStep: 0,
          isCompleted: false,
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

export { migrateTourSteps, migrateTours };
