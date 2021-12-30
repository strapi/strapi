/**
 *
 * GuidedTourProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({ children, currentStep, setStep, guidedTourState }) => {
  return (
    <GuidedTourContext.Provider value={{ currentStep, guidedTourState, setStep }}>
      {children}
    </GuidedTourContext.Provider>
  );
};

GuidedTourProvider.defaultProps = {
  currentStep: null,
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
  setStep: PropTypes.func.isRequired,
};

export default GuidedTourProvider;
