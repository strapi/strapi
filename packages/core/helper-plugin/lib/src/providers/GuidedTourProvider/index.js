import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({
  children,
  currentStep,
  setCurrentStep,
  guidedTourState,
  setGuidedTourVisibility,
  setStepState,
  isGuidedTourVisible,
}) => {
  return (
    <GuidedTourContext.Provider
      value={{
        currentStep,
        guidedTourState,
        setCurrentStep,
        setStepState,
        setGuidedTourVisibility,
        isGuidedTourVisible,
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
  setCurrentStep: PropTypes.func.isRequired,
  setGuidedTourVisibility: PropTypes.func.isRequired,
  setStepState: PropTypes.func.isRequired,
};

export default GuidedTourProvider;
