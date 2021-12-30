/**
 *
 * GuidedTourProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const GuidedTourProvider = ({ children, currentStep, setStep }) => {
  return (
    <GuidedTourContext.Provider value={{ currentStep, setStep }}>
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
  setStep: PropTypes.func.isRequired,
};

export default GuidedTourProvider;
