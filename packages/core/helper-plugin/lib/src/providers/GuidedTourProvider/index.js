/**
 *
 * GuidedTourProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({
  children,
  currentStep,
  setStep,
  guidedTourState,
  setGuidedTourVisibility,
  isGuidedTourVisible,
}) => {
  return (
    <GuidedTourContext.Provider
      value={{
        currentStep,
        guidedTourState,
        setStep,
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
  setStep: PropTypes.func.isRequired,
  setGuidedTourVisibility: PropTypes.func.isRequired,
};

export default GuidedTourProvider;
