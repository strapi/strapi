import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({ children, ...value }) => {
  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>;
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
