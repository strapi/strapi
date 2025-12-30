import * as React from 'react';

import { produce } from 'immer';

import { useTracking } from '../../features/Tracking';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { usePersistentState } from '../../hooks/usePersistentState';
import { createContext } from '../Context';

import { type Tours, tours as guidedTours } from './Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';
import { migrateTours } from './utils/migrations';

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
    }
  | {
      type: 'remove_completed_action';
      payload: ValueOf<CompletedActions>;
    }
  | {
      type: 'set_tour_type';
      payload: {
        tourName: ValidTourName;
        tourType: 'ContentTypeBuilderAI' | 'ContentTypeBuilderNoAI';
      };
    }
  | {
      type: 'set_hidden';
      payload: boolean;
    };

type TourState = Record<
  ValidTourName,
  { currentStep: number; isCompleted: boolean; tourType?: string }
>;
type State = {
  tours: TourState;
  enabled: boolean;
  hidden?: boolean;
  completedActions: CompletedActions;
};

const [GuidedTourProviderImpl, useGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

const getInitialTourState = (tours: Tours) => {
  return Object.keys(tours).reduce((acc, tourName) => {
    acc[tourName as ValidTourName] = {
      currentStep: 0,
      isCompleted: false,
      tourType: undefined,
    };

    return acc;
  }, {} as TourState);
};

const getCompletedTours = (tours: TourState): ValidTourName[] => {
  return Object.keys(tours).filter(
    (tourName) => tours[tourName as ValidTourName].isCompleted
  ) as ValidTourName[];
};

const areAllToursCompleted = (tours: TourState) => Object.values(tours).every((t) => t.isCompleted);

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'next_step') {
      const currentStep = draft.tours[action.payload].currentStep;
      const tourLength = guidedTours[action.payload]._meta.totalStepCount;

      const nextStep = currentStep + 1;
      draft.tours[action.payload].currentStep = nextStep;
      draft.tours[action.payload].isCompleted = nextStep >= tourLength;
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

    if (action.type === 'remove_completed_action') {
      draft.completedActions = draft.completedActions.filter(
        (completedAction) => completedAction !== action.payload
      );
    }

    if (action.type === 'skip_all_tours') {
      draft.enabled = false;
    }

    if (action.type === 'set_hidden') {
      draft.hidden = action.payload;
    }

    if (action.type === 'reset_all_tours') {
      draft.enabled = true;
      draft.tours = getInitialTourState(guidedTours);
      draft.completedActions = [];
    }

    if (action.type === 'go_to_step') {
      draft.tours[action.payload.tourName].currentStep = action.payload.step;
    }

    if (action.type === 'set_tour_type') {
      const { tourName, tourType } = action.payload;
      const currentTour = draft.tours[tourName];

      // If tour type changes and tour is not completed, reset to step 0
      if (currentTour.tourType && currentTour.tourType !== tourType && !currentTour.isCompleted) {
        currentTour.currentStep = 0;
      }

      currentTour.tourType = tourType;
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
  const isDesktop = useIsDesktop();
  const { trackUsage } = useTracking();
  const [storedTours, setStoredTours] = usePersistentState<State>(STORAGE_KEY, {
    tours: getInitialTourState(guidedTours),
    enabled,
    hidden: !isDesktop,
    completedActions: [],
  });
  const migratedTourState = migrateTours(storedTours);
  const [state, dispatch] = React.useReducer(reducer, migratedTourState);

  // Watch for changes to enabled prop to update state
  React.useEffect(() => {
    dispatch({ type: 'set_hidden', payload: !isDesktop });
  }, [isDesktop]);

  // Sync local storage
  React.useEffect(() => {
    setStoredTours(state);
  }, [state, setStoredTours]);

  // Derive all completed tours from state
  const currentAllCompletedState = areAllToursCompleted(state.tours);
  // Store completed state in ref to survive a re-render,
  // when current state changes this will persist and be used for comparison
  const previousAllCompletedStateRef = React.useRef(currentAllCompletedState);
  React.useEffect(() => {
    const previousAllCompletedState = previousAllCompletedStateRef.current;
    // When the previous state was not complete but the current state is now complete, fire the event
    if (!previousAllCompletedState && currentAllCompletedState) {
      trackUsage('didCompleteGuidedTour', { name: 'all' });
    }

    // When the current state has all tours completed so will the previous state, the tracking event won't fire again
    previousAllCompletedStateRef.current = currentAllCompletedState;
  }, [currentAllCompletedState, trackUsage]);

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { GuidedTourContext, useGuidedTour, reducer, getCompletedTours };
