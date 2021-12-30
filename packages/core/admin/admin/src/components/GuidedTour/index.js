import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { GuidedTourProvider } from '@strapi/helper-plugin';
import reducer, { initialState } from './reducer';

const GuidedTour = ({ children }) => {
  const [{ currentStep }, dispatch] = useReducer(reducer, initialState);

  const setStep = step => {
    dispatch({
      type: 'SET_CURRENT_STEP',
      step,
    });
  };

  return (
    <GuidedTourProvider currentStep={currentStep} setStep={setStep}>
      {children}
    </GuidedTourProvider>
  );
};

GuidedTour.propTypes = {
  children: PropTypes.element.isRequired,
};

export default GuidedTour;
