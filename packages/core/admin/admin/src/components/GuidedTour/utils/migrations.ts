import { produce } from 'immer';

import { tours } from '../Tours';

import { GUIDED_TOUR_REQUIRED_ACTIONS } from './constants';

import type { State, ValidTourName } from '../Context';

const migrateTourSteps = (storedTourState: State) => {
  const storedTourNames = Object.keys(storedTourState.tours) as ValidTourName[];

  return produce(storedTourState, (draft) => {
    storedTourNames.forEach((tourName) => {
      const currentTourLength = Object.keys(tours[tourName]).length;
      const storedTourLength = storedTourState.tours[tourName].length;

      if (currentTourLength !== storedTourLength) {
        draft.tours[tourName].length = currentTourLength;
        draft.tours[tourName].currentStep = 0;
        draft.completedActions = draft.completedActions.filter(
          (action) => !Object.values(GUIDED_TOUR_REQUIRED_ACTIONS[tourName]).includes(action)
        );
      }
    });
  });
};

export { migrateTourSteps };
