import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Children,
  isValidElement,
  FormEvent,
  useEffect,
} from 'react';

import { Modal, Box, Button, Typography } from '@strapi/design-system';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface StepModalContextType {
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => Promise<boolean>;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  totalSteps: number;
  isLoading: boolean;
  error: Error | null;
  setError: (error: Error | null) => void;
}

const StepModalContext = createContext<StepModalContextType | null>(null);

export const useStepModal = () => {
  const context = useContext(StepModalContext);
  if (!context) {
    throw new Error('useStepModal must be used within a StepModal');
  }
  return context;
};

/* -------------------------------------------------------------------------------------------------
 * StepModal
 * -----------------------------------------------------------------------------------------------*/

interface StepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface StepProps {
  title?: string;
  children: ReactNode;
  nextLabel?: string;
  cancelLabel?: string;
  backLabel?: string;
  disableNext?: boolean;
  onNext?: () => Promise<boolean> | boolean;
}

const StepModal = ({
  open,
  onOpenChange,
  title,
  children,
  onComplete,
  onCancel,
}: StepModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const childrenArray = Children.toArray(children)
    .filter((child): child is React.ReactElement => isValidElement(child))
    .map((child) => child.props);

  const totalSteps = childrenArray.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Reset states when modal is closed
      setCurrentStep(0);
      setIsLoading(false);
      setError(null);
    }
  }, [open]);

  const resetStates = () => {
    setCurrentStep(0);
    setIsLoading(false);
    setError(null);
  };

  const handleCancel = () => {
    onCancel?.();
    resetStates();
    onOpenChange(false);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setError(null);
  };

  const nextStep = async () => {
    const currentStepProps = childrenArray[currentStep];

    if (currentStepProps.onNext) {
      setIsLoading(true);
      setError(null);

      try {
        if (isLastStep) {
          onComplete?.();
          resetStates();
          onOpenChange(false);
        } else {
          await currentStepProps.onNext();
          setCurrentStep((prev) => prev + 1);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Default behavior: just move to next step
      if (isLastStep) {
        onComplete?.();
        resetStates();
        onOpenChange(false);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
      return true;
    }
  };

  // Handle form submission (triggered by Enter key)
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading && !childrenArray[currentStep]?.disableNext) {
      nextStep();
    }
  };

  const contextValue = {
    currentStep,
    goToStep: setCurrentStep,
    nextStep,
    prevStep: handleBack,
    isFirstStep,
    isLastStep,
    totalSteps,
    isLoading,
    error,
    setError,
  };

  const currentChild = childrenArray[currentStep];

  return (
    <StepModalContext.Provider value={contextValue}>
      {open && (
        <Modal.Root open onOpenChange={handleCancel}>
          <Modal.Content>
            <Modal.Header>
              <Typography variant="omega" fontWeight="bold">
                {currentChild?.title || title}
              </Typography>
            </Modal.Header>

            <form onSubmit={handleFormSubmit}>
              <Modal.Body>
                {Children.toArray(children)[currentStep]}

                {error && (
                  <Box
                    marginTop={4}
                    padding={3}
                    background="danger100"
                    color="danger600"
                    borderRadius="4px"
                  >
                    <Typography variant="pi">{error.message}</Typography>
                  </Box>
                )}
              </Modal.Body>

              <Modal.Footer>
                {isFirstStep ? (
                  <Button variant="tertiary" onClick={handleCancel} type="button">
                    {currentChild?.cancelLabel || 'Cancel'}
                  </Button>
                ) : (
                  <Button variant="tertiary" onClick={handleBack} type="button">
                    {currentChild?.backLabel || 'Back'}
                  </Button>
                )}

                <Button
                  variant="default"
                  type="submit"
                  disabled={isLoading || currentChild?.disableNext}
                  loading={isLoading}
                >
                  {currentChild?.nextLabel || (isLastStep ? 'Complete' : 'Next')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Content>
        </Modal.Root>
      )}
    </StepModalContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step
 * -----------------------------------------------------------------------------------------------*/

const Step = ({ children }: StepProps) => {
  return <>{children}</>;
};

StepModal.Step = Step;

export { StepModal, Step };
