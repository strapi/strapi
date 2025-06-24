import * as React from 'react';

import { produce } from 'immer';

import { GetGuidedTourMeta } from '../../../../shared/contracts/admin';
import { useAuth } from '../../features/Auth';
import { useGetGuidedTourMetaQuery } from '../../services/admin';
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
    }
  | {
      type: 'init';
      payload: GetGuidedTourMeta.Response['data'];
    };

type Tour = Record<ValidTourName, { currentStep: number; length: number; isCompleted: boolean }>;
type State = {
  tours: Tour;
  meta: GetGuidedTourMeta.Response['data'];
  completedActions: string[];
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

    if (action.type === 'init') {
      draft.meta = action.payload;

      const requiredActions = Object.keys(action.payload).filter((key) => {
        return key !== 'isFirstSuperAdminUser';
      });

      requiredActions.forEach((requiredAction) => {
        if (action.payload[requiredAction as keyof typeof action.payload]) {
          draft.completedActions.push(requiredAction);
        }
      });
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
  const currentUser = useAuth('GuidedTour', (s) => s.user);
  const { data: guidedTourMeta } = useGetGuidedTourMetaQuery(
    {
      id: currentUser?.id,
    },
    { skip: !currentUser?.id }
  );

  // TODO: Get local storage to init state
  // Derive the tour state from the tours object
  const tours = Object.keys(registeredTours).reduce((acc, tourName) => {
    const tourLength = Object.keys(registeredTours[tourName as ValidTourName]).length;
    acc[tourName as ValidTourName] = {
      currentStep: 0,
      length: tourLength,
      isCompleted: false,
    };
    return acc;
  }, {} as Tour);

  const [state, dispatch] = React.useReducer(reducer, {
    tours,
    completedActions: [],
    meta: guidedTourMeta?.data ?? {
      isFirstSuperAdminUser: false,
      didCreateContentTypeSchema: false,
      didCreateContent: false,
      didCreateApiToken: false,
    },
  });

  // Sync the meta data from the server, on first render it will have intialized as undefined in the reducer
  React.useEffect(() => {
    if (guidedTourMeta?.data) {
      dispatch({ type: 'init', payload: guidedTourMeta.data });
    }
  }, [guidedTourMeta?.data]);

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { UnstableGuidedTourContext, unstableUseGuidedTour, reducer };
