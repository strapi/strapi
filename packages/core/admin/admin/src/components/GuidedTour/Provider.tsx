import * as React from 'react';

import { produce } from 'immer';
import get from 'lodash/get';
import set from 'lodash/set';

const GUIDED_TOUR_COMPLETED_STEPS = 'GUIDED_TOUR_COMPLETED_STEPS';
const GUIDED_TOUR_CURRENT_STEP = 'GUIDED_TOUR_CURRENT_STEP';
const GUIDED_TOUR_SKIPPED = 'GUIDED_TOUR_SKIPPED';

const GUIDED_TOUR_KEYS = {
  GUIDED_TOUR_COMPLETED_STEPS,
  GUIDED_TOUR_CURRENT_STEP,
  GUIDED_TOUR_SKIPPED,
} as const;

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

import { createContext } from '../Context';

type SectionKey = keyof GuidedTourContextValue['guidedTourState'];
type StepKey = keyof GuidedTourContextValue['guidedTourState'][SectionKey];
type Step = `${SectionKey}.${StepKey}`;
interface GuidedTourContextValue {
  currentStep: Step | null;
  guidedTourState: {
    contentTypeBuilder: {
      create: boolean;
      success: boolean;
    };
    contentManager: {
      create: boolean;
      success: boolean;
    };
    apiTokens: {
      create: boolean;
      success: boolean;
    };
  };
  isGuidedTourVisible: boolean;
  isSkipped: boolean;
  setCurrentStep: (step: Step | null) => void | null;
  setGuidedTourVisibility: (isVisible: boolean) => void;
  setSkipped: (isSkipped: boolean) => void;
  setStepState: (step: Step, state: boolean) => void;
  startSection: (section: SectionKey) => void;
}

const [GuidedTourProviderImpl, useGuidedTour] = createContext<GuidedTourContextValue>('GuidedTour');

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
      const [sectionName, stepName] = step.split('.') as [SectionKey, StepKey];
      const sectionArray = Object.entries(guidedTourState[sectionName]);

      const currentStepIndex = sectionArray.findIndex(([key]) => key === stepName);
      const previousSteps = sectionArray.slice(0, currentStepIndex);

      const isStepToShow = previousSteps.every(([, sectionValue]) => sectionValue);

      if (isStepAlreadyDone || isSkipped || !isStepToShow) {
        return null;
      }
    }

    window.localStorage.setItem(GUIDED_TOUR_CURRENT_STEP, JSON.stringify(null));

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

  const setStepState = (currentStep: Step, value: SetStepStateAction['value']) => {
    addCompletedStep(currentStep);

    dispatch({
      type: 'SET_STEP_STATE',
      currentStep,
      value,
    });
  };

  const startSection = (sectionName: SectionKey) => {
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

      const [firstStep] = Object.keys(sectionSteps) as [StepKey];
      const isFirstStepDone = sectionSteps[firstStep];

      if (isSectionToShow && !currentStep && !isFirstStepDone) {
        setCurrentStep(`${sectionName}.${firstStep}`);
      }
    }
  };

  const setSkipped = (value: SetSkippedAction['value']) => {
    window.localStorage.setItem(GUIDED_TOUR_SKIPPED, JSON.stringify(value));

    dispatch({
      type: 'SET_SKIPPED',
      value,
    });
  };

  return (
    <GuidedTourProviderImpl
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
    </GuidedTourProviderImpl>
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
  step: Step | null;
}

interface SetStepStateAction {
  type: 'SET_STEP_STATE';
  currentStep: Step;
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
        const [section, step] = action.currentStep.split('.') as [SectionKey, StepKey];
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
  const guidedTourLocaleStorage = JSON.parse(
    window.localStorage.getItem(GUIDED_TOUR_COMPLETED_STEPS) ?? '[]'
  );
  const currentStepLocaleStorage = JSON.parse(
    window.localStorage.getItem(GUIDED_TOUR_CURRENT_STEP) ?? 'null'
  );
  const skippedLocaleStorage = JSON.parse(
    window.localStorage.getItem(GUIDED_TOUR_SKIPPED) ?? 'null'
  );

  if (Array.isArray(guidedTourLocaleStorage)) {
    guidedTourLocaleStorage.forEach((step) => {
      const [sectionName, stepName] = step.split('.');
      set(copyInitialState, ['guidedTourState', sectionName, stepName], true);
    });
  }

  // if current step when initializing mark it as done
  if (currentStepLocaleStorage) {
    const [sectionName, stepName] = currentStepLocaleStorage.split('.') as [SectionKey, StepKey];
    set(copyInitialState, ['guidedTourState', sectionName, stepName], true);

    addCompletedStep(currentStepLocaleStorage as Step);

    window.localStorage.setItem(GUIDED_TOUR_CURRENT_STEP, JSON.stringify(null));
  }

  if (skippedLocaleStorage !== null) {
    set(copyInitialState, 'isSkipped', skippedLocaleStorage);
  }

  return copyInitialState;
};

/**
 * @description Add a completed step to the local storage if it does not already exist.
 */
const addCompletedStep = (completedStep: Step) => {
  const currentSteps = JSON.parse(window.localStorage.getItem(GUIDED_TOUR_COMPLETED_STEPS) ?? '[]');

  if (!Array.isArray(currentSteps)) {
    return;
  }

  const isAlreadyStored = currentSteps.includes(completedStep);

  if (isAlreadyStored) {
    return;
  }

  window.localStorage.setItem(
    GUIDED_TOUR_COMPLETED_STEPS,
    JSON.stringify([...currentSteps, completedStep])
  );
};

export { GuidedTourProvider, useGuidedTour, GuidedTourContextValue, GUIDED_TOUR_KEYS };
