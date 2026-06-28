import * as React from 'react';

import { produce } from 'immer';

import { useTracking } from '../../features/Tracking';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { usePersistentState } from '../../hooks/usePersistentState';
import { createContext } from '../Context';

import { guidedTours } from './tourDefinitions';
import { type Action, type CompletedActions, type State, type ValidTourName } from './types';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';
import { migrateTours } from './utils/migrations';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

/**
 * Derive the union of all string literal values from GUIDED_TOUR_REQUIRED_ACTIONS
 * (ie didCreateContentTypeSchema | didCreateContent etc...)
 */
type ValueOf<T> = T[keyof T];

const [GuidedTourProviderImpl, useGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

const getInitialTourState = () => {
  return Object.keys(guidedTours).reduce(
    (acc, tourName) => {
      acc[tourName as ValidTourName] = {
        currentStep: 0,
        isCompleted: false,
        tourType: undefined,
      };

      return acc;
    },
    {} as State['tours']
  );
};

const getCompletedTours = (tours: State['tours']): ValidTourName[] => {
  return Object.keys(tours).filter(
    (tourName) => tours[tourName as ValidTourName].isCompleted
  ) as ValidTourName[];
};

const areAllToursCompleted = (tours: State['tours']) =>
  Object.values(tours).every((t) => t.isCompleted);

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
      draft.tours = getInitialTourState();
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
    tours: getInitialTourState(),
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

  // Sync into usePersistentState in the layout phase so localStorage is updated before the
  // browser follows an external link (e.g. Strapi Cloud "Read documentation").
  React.useLayoutEffect(() => {
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

export type { Action, CompletedActions, State, ValidTourName, ValueOf };
export { GuidedTourContext, useGuidedTour, reducer, getCompletedTours };
