import * as React from 'react';

import { produce } from 'immer';

import { createContext } from '../Context';

import type { Tours } from './Tours';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

// Infer valid tour names from the tours object
type ValidTourName = keyof Tours;

// Now use ValidTourName in all type definitions
type Action = {
  type: 'next_step';
  payload: ValidTourName;
};

type State = {
  currentSteps: Record<ValidTourName, number>;
};

const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'next_step') {
      draft.currentSteps[action.payload] += 1;
    }
  });
}

const UnstableGuidedTourContext = ({
  children,
  tours,
}: {
  children: React.ReactNode;
  tours: Tours;
}) => {
  // Derive the tour steps from the tours object
  const currentSteps = Object.keys(tours).reduce(
    (acc, tourName) => {
      acc[tourName as ValidTourName] = 0;
      return acc;
    },
    {} as Record<ValidTourName, number>
  );
  const [state, dispatch] = React.useReducer(reducer, {
    currentSteps,
  });

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { UnstableGuidedTourContext, unstableUseGuidedTour, reducer };
