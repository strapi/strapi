import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({
  children,
  currentStep,
  setCurrentStep,
  guidedTourState,
  setGuidedTourVisibility,
  setSkipped,
  setStepState,
  startSection,
  isGuidedTourVisible,
  isSkipped,
}) => {
  return (
    <GuidedTourContext.Provider
      value={{
        currentStep,
        guidedTourState,
        setCurrentStep,
        setSkipped,
        setStepState,
        setGuidedTourVisibility,
        startSection,
        isGuidedTourVisible,
        isSkipped,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
};

GuidedTourProvider.defaultProps = {
  currentStep: null,
  isGuidedTourVisible: false,
};

GuidedTourProvider.propTypes = {
  children: PropTypes.node.isRequired,
  currentStep: PropTypes.string,
  guidedTourState: PropTypes.objectOf(
    PropTypes.shape({
      create: PropTypes.bool,
      success: PropTypes.bool,
    })
  ).isRequired,
  isGuidedTourVisible: PropTypes.bool,
  isSkipped: PropTypes.bool.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
  setGuidedTourVisibility: PropTypes.func.isRequired,
  setSkipped: PropTypes.func.isRequired,
  setStepState: PropTypes.func.isRequired,
  startSection: PropTypes.func.isRequired,
};

export default GuidedTourProvider;
