import * as React from 'react';

import { produce } from 'immer';

import { GetGuidedTourMeta } from '../../../../shared/contracts/admin';
import { useGetGuidedTourMetaQuery } from '../../services/admin';
import { createContext } from '../Context';

import { type Tours, tours as guidedTours } from './Tours';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

type ValidTourName = keyof Tours;

export type ExtendedCompletedActions = (
  | GetGuidedTourMeta.Response['data']['completedActions'][number]
  | 'didCopyApiToken'
)[];

type Action =
  | {
      type: 'next_step';
      payload: ValidTourName;
    }
  | {
      type: 'skip_tour';
      payload: ValidTourName;
    }
  | {
      type: 'set_completed_actions';
      payload: ExtendedCompletedActions;
    };

type Tour = Record<ValidTourName, { currentStep: number; length: number; isCompleted: boolean }>;
type State = {
  tours: Tour;
  enabled: boolean;
  completedActions: ExtendedCompletedActions;
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
    }

    if (action.type === 'skip_tour') {
      draft.tours[action.payload].isCompleted = true;
    }

    if (action.type === 'set_completed_actions') {
      draft.completedActions = [...new Set([...draft.completedActions, ...action.payload])];
    }
  });
}

const UnstableGuidedTourContext = ({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) => {
  const stored = getTourStateFromLocalStorage();
  const initialState = stored
    ? stored
    : {
        tours: Object.keys(guidedTours).reduce((acc, tourName) => {
          const tourLength = Object.keys(guidedTours[tourName as ValidTourName]).length;
          acc[tourName as ValidTourName] = {
            currentStep: 0,
            length: tourLength,
            isCompleted: false,
          };
          return acc;
        }, {} as Tour),
        enabled,
        completedActions: [],
      };

  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Sync local storage
  React.useEffect(() => {
    if (window.strapi.future.isEnabled('unstableGuidedTour')) {
      saveTourStateToLocalStorage(state);
    }
  }, [state]);

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Local Storage
 * -----------------------------------------------------------------------------------------------*/

const STORAGE_KEY = 'STRAPI_GUIDED_TOUR';
function getTourStateFromLocalStorage(): State | null {
  const tourState = localStorage.getItem(STORAGE_KEY);
  return tourState ? JSON.parse(tourState) : null;
}

function saveTourStateToLocalStorage(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export type { Action, State, ValidTourName };
export { UnstableGuidedTourContext, unstableUseGuidedTour, reducer };
