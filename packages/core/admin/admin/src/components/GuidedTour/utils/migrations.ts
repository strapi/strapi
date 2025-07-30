import { produce } from 'immer';

import { tours } from '../Tours';

import type { State, ValidTourName } from '../Context';

const migrateTourLengths = (tourState: State) => {
  return produce(tourState, (draft) => {
    Object.keys(tourState.tours).forEach((tourName) => {
      const tourLength = Object.keys(tours[tourName as ValidTourName]).length;
      draft.tours[tourName as ValidTourName].length = tourLength;
    });
  });
};

export { migrateTourLengths };
