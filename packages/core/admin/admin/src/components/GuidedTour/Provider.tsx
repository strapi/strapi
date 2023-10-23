import * as React from 'react';

import {
  GuidedTourContextValue,
  GuidedTourProvider as GuidedTourProviderComponent,
  GuidedTourSectionKey,
  GuidedTourStep,
  GuidedTourStepKey,
  auth,
} from '@strapi/helper-plugin';
import produce from 'immer';
import get from 'lodash/get';
import set from 'lodash/set';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

interface GuidedTourProviderProps {
  children: React.ReactNode;
}

const GuidedTourProvider = ({ children }: GuidedTourProviderProps) => {
  const [{ currentStep, guidedTourState, isGuidedTourVisible, isSkipped }, dispatch] =
    React.useReducer(reducer, initialState, initialiseState);

  const setCurrentStep = (step: SetCurrentStepAction['step']) => {
    // if step is null it is intentional, we need to dispatch it
    if (step !== null) {
      const isStepAlreadyDone = get(guidedTourState, step);
      const [sectionName, stepName] = step.split('.') as [GuidedTourSectionKey, GuidedTourStepKey];
      const sectionArray = Object.entries(guidedTourState[sectionName]);

      const currentStepIndex = sectionArray.findIndex(([key]) => key === stepName);
      const previousSteps = sectionArray.slice(0, currentStepIndex);

      const isStepToShow = previousSteps.every(([, sectionValue]) => sectionValue);

      if (isStepAlreadyDone || isSkipped || !isStepToShow) {
        return null;
      }
    }

    auth.set(null, 'GUIDED_TOUR_CURRENT_STEP', true);

    return dispatch({
      type: 'SET_CURRENT_STEP',
      step,
    });
  };

  const setGuidedTourVisibility = (value: SetGuidedTourVisibilityAction['value']) => {
    dispatch({
      type: 'SET_GUIDED_TOUR_VISIBILITY',
      value,
    });
  };

  const setStepState = (currentStep: GuidedTourStep, value: SetStepStateAction['value']) => {
    addCompletedStep(currentStep);

    dispatch({
      type: 'SET_STEP_STATE',
      currentStep,
      value,
    });
  };

  const startSection = (sectionName: GuidedTourSectionKey) => {
    const sectionSteps = guidedTourState[sectionName];

    if (sectionSteps) {
      const guidedTourArray = Object.entries(guidedTourState);

      // Find current section position in the guidedTourArray
      // Get only previous sections based on current section position
      const currentSectionIndex = guidedTourArray.findIndex(([key]) => key === sectionName);
      const previousSections = guidedTourArray.slice(0, currentSectionIndex);

      // Check if every steps from previous section are done
      const isSectionToShow = previousSections.every(([, sectionValue]) =>
        Object.values(sectionValue).every(Boolean)
      );

      const [firstStep] = Object.keys(sectionSteps) as [GuidedTourStepKey];
      const isFirstStepDone = sectionSteps[firstStep];

      if (isSectionToShow && !currentStep && !isFirstStepDone) {
        setCurrentStep(`${sectionName}.${firstStep}`);
      }
    }
  };

  const setSkipped = (value: SetSkippedAction['value']) => {
    auth.set(value, 'GUIDED_TOUR_SKIPPED', true);

    dispatch({
      type: 'SET_SKIPPED',
      value,
    });
  };

  return (
    <GuidedTourProviderComponent
      guidedTourState={guidedTourState}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      setGuidedTourVisibility={setGuidedTourVisibility}
      setSkipped={setSkipped}
      setStepState={setStepState}
      startSection={startSection}
      isGuidedTourVisible={isGuidedTourVisible}
      isSkipped={isSkipped}
    >
      {children}
    </GuidedTourProviderComponent>
  );
};

type State = Pick<
  GuidedTourContextValue,
  'guidedTourState' | 'currentStep' | 'isGuidedTourVisible' | 'isSkipped'
>;

const initialState = {
  currentStep: null,
  guidedTourState: {
    contentTypeBuilder: {
      create: false,
      success: false,
    },
    contentManager: {
      create: false,
      success: false,
    },
    apiTokens: {
      create: false,
      success: false,
    },
  },
  isGuidedTourVisible: false,
  isSkipped: false,
} satisfies State;

interface SetCurrentStepAction {
  type: 'SET_CURRENT_STEP';
  step: GuidedTourStep | null;
}

interface SetStepStateAction {
  type: 'SET_STEP_STATE';
  currentStep: GuidedTourStep;
  value: boolean;
}

interface SetSkippedAction {
  type: 'SET_SKIPPED';
  value: boolean;
}

interface SetGuidedTourVisibilityAction {
  type: 'SET_GUIDED_TOUR_VISIBILITY';
  value: boolean;
}

type Action =
  | SetCurrentStepAction
  | SetStepStateAction
  | SetSkippedAction
  | SetGuidedTourVisibilityAction;

const reducer: React.Reducer<State, Action> = (state: State = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_CURRENT_STEP': {
        draftState.currentStep = action.step;
        break;
      }
      case 'SET_STEP_STATE': {
        const [section, step] = action.currentStep.split('.') as [
          GuidedTourSectionKey,
          GuidedTourStepKey
        ];
        draftState.guidedTourState[section][step] = action.value;
        break;
      }
      case 'SET_SKIPPED': {
        draftState.isSkipped = action.value;
        break;
      }
      case 'SET_GUIDED_TOUR_VISIBILITY': {
        draftState.isGuidedTourVisible = action.value;
        break;
      }
      default: {
        return draftState;
      }
    }
  });

const initialiseState = (initialState: State) => {
  const copyInitialState = { ...initialState };
  const guidedTourLocaleStorage = auth.get('GUIDED_TOUR_COMPLETED_STEPS');
  const currentStepLocaleStorage = auth.get('GUIDED_TOUR_CURRENT_STEP');
  const skippedLocaleStorage = auth.get('GUIDED_TOUR_SKIPPED');

  if (Array.isArray(guidedTourLocaleStorage)) {
    guidedTourLocaleStorage.forEach((step) => {
      const [sectionName, stepName] = step.split('.');
      set(copyInitialState, ['guidedTourState', sectionName, stepName], true);
    });
  }

  // if current step when initializing mark it as done
  if (currentStepLocaleStorage) {
    const [sectionName, stepName] = currentStepLocaleStorage.split('.') as [
      GuidedTourSectionKey,
      GuidedTourStepKey
    ];
    set(copyInitialState, ['guidedTourState', sectionName, stepName], true);

    addCompletedStep(currentStepLocaleStorage as GuidedTourStep);

    auth.set(null, 'GUIDED_TOUR_CURRENT_STEP', true);
  }

  if (skippedLocaleStorage !== null) {
    set(copyInitialState, 'isSkipped', skippedLocaleStorage);
  }

  return copyInitialState;
};

/**
 * @description Add a completed step to the local storage if it does not already exist.
 */
const addCompletedStep = (completedStep: GuidedTourStep) => {
  const currentSteps = auth.get('GUIDED_TOUR_COMPLETED_STEPS') ?? [];

  if (!Array.isArray(currentSteps)) {
    return;
  }

  const isAlreadyStored = currentSteps.includes(completedStep);

  if (isAlreadyStored) {
    return;
  }

  auth.set([...currentSteps, completedStep], 'GUIDED_TOUR_COMPLETED_STEPS', true);
};

export { GuidedTourProvider };
