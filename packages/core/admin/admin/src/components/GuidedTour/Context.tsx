import * as React from 'react';

import { produce } from 'immer';

import { usePersistentState } from '../../hooks/usePersistentState';
import { createContext } from '../Context';

import { type Tours, tours as guidedTours } from './Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';
import { migrateTourSteps, migrateTours } from './utils/migrations';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

type ValidTourName = keyof Tours;

/**
 * Derive the union of all string literal values from GUIDED_TOUR_REQUIRED_ACTIONS
 * (ie didCreateContentTypeSchema | didCreateContent etc...)
 */
type ValueOf<T> = T[keyof T];
type NonEmptyValueOf<T> = T extends Record<string, never> ? never : ValueOf<T>;
export type CompletedActions = NonEmptyValueOf<ValueOf<typeof GUIDED_TOUR_REQUIRED_ACTIONS>>[];

type Action =
  | {
      type: 'next_step';
      payload: ValidTourName;
    }
  | {
      type: 'previous_step';
      payload: ValidTourName;
    }
  | {
      type: 'go_to_step';
      payload: {
        tourName: ValidTourName;
        step: number;
      };
    }
  | {
      type: 'skip_tour';
      payload: ValidTourName;
    }
  | {
      type: 'skip_all_tours';
    }
  | {
      type: 'reset_all_tours';
    }
  | {
      type: 'set_completed_actions';
      payload: CompletedActions;
    };

type TourState = Record<
  ValidTourName,
  { currentStep: number; length: number; isCompleted: boolean }
>;
type State = {
  tours: TourState;
  enabled: boolean;
  completedActions: CompletedActions;
};

const [GuidedTourProviderImpl, useGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

const getInitialTourState = (tours: Tours) => {
  return Object.keys(tours).reduce((acc, tourName) => {
    const tourLength = Object.keys(tours[tourName as ValidTourName]).length;
    acc[tourName as ValidTourName] = {
      currentStep: 0,
      length: tourLength,
      isCompleted: false,
    };

    return acc;
  }, {} as TourState);
};

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'next_step') {
      const currentStep = draft.tours[action.payload].currentStep;
      const tourLength = draft.tours[action.payload].length;

      if (currentStep >= tourLength) return;

      const nextStep = currentStep + 1;
      draft.tours[action.payload].currentStep = nextStep;
      draft.tours[action.payload].isCompleted = nextStep === tourLength;
    }

    if (action.type === 'previous_step') {
      const currentStep = draft.tours[action.payload].currentStep;

      if (currentStep <= 0) return;

      const previousStep = currentStep - 1;
      draft.tours[action.payload].currentStep = previousStep;
    }

    if (action.type === 'skip_tour') {
      draft.tours[action.payload].isCompleted = true;
    }

    if (action.type === 'set_completed_actions') {
      draft.completedActions = [...new Set([...draft.completedActions, ...action.payload])];
    }

    if (action.type === 'skip_all_tours') {
      draft.enabled = false;
    }

    if (action.type === 'reset_all_tours') {
      draft.enabled = true;
      draft.tours = getInitialTourState(guidedTours);
      draft.completedActions = [];
    }

    if (action.type === 'go_to_step') {
      draft.tours[action.payload.tourName].currentStep = action.payload.step;
    }
  });
}

const STORAGE_KEY = 'STRAPI_GUIDED_TOUR';
const GuidedTourContext = ({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) => {
  const [storedTours, setStoredTours] = usePersistentState<State>(STORAGE_KEY, {
    tours: getInitialTourState(guidedTours),
    enabled,
    completedActions: [],
  });
  const migratedTourState = migrateTourSteps(migrateTours(storedTours));
  const [state, dispatch] = React.useReducer(reducer, migratedTourState);

  // Sync local storage
  React.useEffect(() => {
    setStoredTours(state);
  }, [state, setStoredTours]);

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { GuidedTourContext, useGuidedTour, reducer };
