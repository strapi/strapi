import React, { useEffect, useState } from 'react';
import at from 'lodash/at';
import { useGuidedTour } from '@strapi/helper-plugin';
import layout from '../layout';
import Modal from './Modal';
import StepperModal from '../Stepper/Modal/StepperModal';

const GuidedTourModal = () => {
  const {
    currentStep,
    guidedTourState,
    setCurrentStep,
    setStepState,
    isGuidedTourVisible,
    setSkipped,
  } = useGuidedTour();
  const [stepContent, setStepContent] = useState();
  const [isVisible, setIsVisible] = useState(currentStep);

  const [sectionIndex, setSectionIndex] = useState(null);
  const [stepIndex, setStepIndex] = useState(null);
  const [hasSectionAfter, setHasSectionAfter] = useState(null);

  useEffect(() => {
    if (!currentStep) {
      setIsVisible(false);

      return;
    }

    const [isStepDone] = at(guidedTourState, currentStep);

    setIsVisible(!isStepDone && isGuidedTourVisible);
  }, [currentStep, guidedTourState, isGuidedTourVisible]);

  useEffect(() => {
    if (currentStep) {
      const [content] = at(layout, currentStep);
      const sectionKeys = Object.keys(guidedTourState);
      const [sectionName, stepName] = currentStep.split('.');
      const newSectionIndex = sectionKeys.indexOf(sectionName);
      const newStepIndex = Object.keys(guidedTourState[sectionName]).indexOf(stepName);
      const newHasSectionAfter = newSectionIndex < sectionKeys.length - 1;

      setStepContent(content);
      setSectionIndex(newSectionIndex);
      setStepIndex(newStepIndex);
      setHasSectionAfter(newHasSectionAfter);
    }
  }, [currentStep, guidedTourState]);

  const handleCTA = () => {
    setStepState(currentStep, true);

    setCurrentStep(null);
  };

  const handleSkip = () => {
    setSkipped(true);
    setCurrentStep(null);
  };

  if (isVisible && stepContent) {
    return (
      <Modal onSkip={handleSkip} onClose={handleCTA}>
        <StepperModal
          {...stepContent}
          onCTA={handleCTA}
          currentStep={currentStep}
          sectionIndex={sectionIndex}
          stepIndex={stepIndex}
          hasSectionAfter={hasSectionAfter}
        />
      </Modal>
    );
  }

  return null;
};

export default GuidedTourModal;
