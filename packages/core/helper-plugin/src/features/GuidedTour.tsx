import * as React from 'react';

/**
 * TODO: whats the value in having this in the `helper-plugin`? is it actually
 * used externally. I doubt it.
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * ------------------------------------------------------------------------------------------------*/

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
    transferTokens: {
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

const GuidedTourContext = React.createContext<GuidedTourContextValue>({
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
    transferTokens: {
      create: false,
      success: false,
    },
  },
  isGuidedTourVisible: false,
  isSkipped: true,
  setCurrentStep: () => null,
  setGuidedTourVisibility: () => null,
  setSkipped: () => null,
  setStepState: () => null,
  startSection: () => null,
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface GuidedTourProviderProps extends GuidedTourContextValue {
  children: React.ReactNode;
}

const GuidedTourProvider = ({
  children,
  currentStep = null,
  guidedTourState,
  isGuidedTourVisible = false,
  isSkipped,
  setCurrentStep,
  setGuidedTourVisibility,
  setSkipped,
  setStepState,
  startSection,
}: GuidedTourProviderProps) => {
  const value = React.useMemo(
    () => ({
      currentStep,
      guidedTourState,
      isGuidedTourVisible,
      isSkipped,
      setCurrentStep,
      setGuidedTourVisibility,
      setSkipped,
      setStepState,
      startSection,
    }),
    [
      currentStep,
      guidedTourState,
      isGuidedTourVisible,
      isSkipped,
      setCurrentStep,
      setGuidedTourVisibility,
      setSkipped,
      setStepState,
      startSection,
    ]
  );

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>;
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

const useGuidedTour = () => React.useContext(GuidedTourContext);

type GuidedTourStep = Step;
type GuidedTourSectionKey = SectionKey;
type GuidedTourStepKey = StepKey;

export { GuidedTourContext, GuidedTourProvider, useGuidedTour };
export type { GuidedTourContextValue, GuidedTourStep, GuidedTourSectionKey, GuidedTourStepKey };
