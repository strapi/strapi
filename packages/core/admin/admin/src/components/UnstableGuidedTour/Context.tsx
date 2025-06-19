import * as React from 'react';

import { produce } from 'immer';

import { createContext } from '../Context';

import type { Tours } from './Tours';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

type ValidTourName = keyof Tours;

type Action =
  | {
      type: 'next_step';
      payload: ValidTourName;
    }
  | {
      type: 'skip_tour';
      payload: ValidTourName;
    };

type State = {
  tours: Record<ValidTourName, { currentStep: number; length: number; isCompleted: boolean }>;
};

const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('UnstableGuidedTour');

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'next_step') {
      const nextStep = draft.tours[action.payload].currentStep + 1;
      draft.tours[action.payload].currentStep = nextStep;
      draft.tours[action.payload].isCompleted = nextStep === draft.tours[action.payload].length;
      // TODO: Update local storage
    }

    if (action.type === 'skip_tour') {
      draft.tours[action.payload].isCompleted = true;
      // TODO: Update local storage
    }
  });
}

const UnstableGuidedTourContext = ({
  children,
  tours: registeredTours,
}: {
  children: React.ReactNode;
  // NOTE: Maybe we just import this directly instead of a prop?
  tours: Tours;
}) => {
  // Derive the tour state from the tours object
  const tours = Object.keys(registeredTours).reduce(
    (acc, tourName) => {
      const tourLength = Object.keys(registeredTours[tourName as ValidTourName]).length;
      acc[tourName as ValidTourName] = {
        currentStep: 0,
        length: tourLength,
        isCompleted: false,
      };
      return acc;
    },
    {} as Record<ValidTourName, { currentStep: number; length: number; isCompleted: boolean }>
  );
  const [state, dispatch] = React.useReducer(reducer, {
    tours,
  });

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { UnstableGuidedTourContext, unstableUseGuidedTour, reducer };
