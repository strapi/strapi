import React, { useEffect, useState, useReducer } from 'react';
import at from 'lodash/at';
import { useGuidedTour, useTracking } from '@strapi/helper-plugin';
import layout from '../layout';
import Modal from './components/Modal';
import reducer, { initialState } from './reducer';
import StepperModal from './components/Stepper';

const GuidedTourModal = () => {
  const {
    currentStep,
    guidedTourState,
    setCurrentStep,
    setStepState,
    isGuidedTourVisible,
    setSkipped,
  } = useGuidedTour();
  const [isVisible, setIsVisible] = useState(currentStep);
  const [
    { stepContent, sectionIndex, stepIndex, hasSectionAfter, hasStepAfter },
    dispatch,
  ] = useReducer(reducer, initialState);
  const { trackUsage } = useTracking();

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
      const newHasStepAfter = newStepIndex < Object.keys(guidedTourState[sectionName]).length - 1;

      dispatch({
        type: 'UPDATE_MODAL',
        content,
        newSectionIndex,
        newStepIndex,
        newHasSectionAfter,
        newHasStepAfter,
      });
    }
  }, [currentStep, guidedTourState]);

  const handleCtaClick = () => {
    setStepState(currentStep, true);
    trackUsage(stepContent.trackingEvent);

    setCurrentStep(null);
  };

  const handleSkip = () => {
    setSkipped(true);
    setCurrentStep(null);
    trackUsage('didSkipGuidedtour');
  };

  if (isVisible && stepContent) {
    return (
      <Modal
        hideSkip={!hasStepAfter && !hasSectionAfter}
        onSkip={handleSkip}
        onClose={handleCtaClick}
      >
        <StepperModal
          {...stepContent}
          onCtaClick={handleCtaClick}
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
