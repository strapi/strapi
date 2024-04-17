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
    mediaLibrary: {
      create: boolean;
      success: boolean;
    };
    profile: {
      create: boolean;
      success: boolean;
    };
    inviteUser: {
      create: boolean;
      success: boolean;
    };
  };
  guidedTourVisibility: string | null;
  isSkipped: boolean;
  setCurrentStep: (step: Step | null) => void | null;
  setGuidedTourVisibility: (isVisible: string) => void;
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
    mediaLibrary: {
      create: false,
      success: false,
    },
    profile: {
      create: false,
      success: false,
    },
    inviteUser: {
      create: false,
      success: false,
    },
  },
  guidedTourVisibility: null,
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
  guidedTourVisibility = null,
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
      guidedTourVisibility,
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
      guidedTourVisibility,
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
