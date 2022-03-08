import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { GuidedTourProvider } from '@strapi/helper-plugin';
import persistStateToLocaleStorage from './utils/persistStateToLocaleStorage';
import arePreviousSectionsDone from './utils/arePreviousSectionsDone';
import arePreviousStepsDone from './utils/arePreviousStepsDone';
import reducer, { initialState } from './reducer';
import init from './init';

const GuidedTour = ({ children }) => {
  const [{ currentStep, guidedTourState, isGuidedTourVisible, isSkipped }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );

  const setCurrentStep = step => {
    // if step is null it is intentional, we need to dispatch it
    if (step !== null) {
      const isStepAlreadyDone = get(guidedTourState, step);
      const isStepToShow = arePreviousStepsDone(step, guidedTourState);

      if (isStepAlreadyDone || isSkipped || !isStepToShow) {
        return null;
      }
    }

    persistStateToLocaleStorage.addCurrentStep(step);

    return dispatch({
      type: 'SET_CURRENT_STEP',
      step,
    });
  };

  const setGuidedTourVisibility = value => {
    dispatch({
      type: 'SET_GUIDED_TOUR_VISIBILITY',
      value,
    });
  };

  const setStepState = (currentStep, value) => {
    persistStateToLocaleStorage.addCompletedStep(currentStep);

    dispatch({
      type: 'SET_STEP_STATE',
      currentStep,
      value,
    });
  };

  const startSection = sectionName => {
    const sectionSteps = guidedTourState[sectionName];

    if (sectionSteps) {
      const isSectionToShow = arePreviousSectionsDone(sectionName, guidedTourState);
      const firstStep = Object.keys(sectionSteps)[0];
      const isFirstStepDone = sectionSteps[firstStep];

      if (isSectionToShow && !currentStep && !isFirstStepDone) {
        return setCurrentStep(`${sectionName}.${firstStep}`);
      }
    }

    return null;
  };

  const setSkipped = value => {
    persistStateToLocaleStorage.setSkipped(value);

    dispatch({
      type: 'SET_SKIPPED',
      value,
    });
  };

  return (
    <GuidedTourProvider
      guidedTourState={guidedTourState}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      setGuidedTourVisibility={setGuidedTourVisibility}
      setSkipped={setSkipped}
      setStepState={setStepState}
      startSection={startSection}
      isGuidedTourVisible={isGuidedTourVisible}
      isSkipped={isSkipped}
    >
      {children}
    </GuidedTourProvider>
  );
};

GuidedTour.propTypes = {
  children: PropTypes.element.isRequired,
};

export default GuidedTour;
