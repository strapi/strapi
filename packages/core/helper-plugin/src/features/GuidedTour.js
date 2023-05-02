import * as React from 'react';

import PropTypes from 'prop-types';

/**
 * TODO: whats the value in having this in the `helper-plugin`? is it actually
 * used externally. I doubt it.
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * ------------------x-----------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} GuidedTourContextValue
 * @property {string} currentStep
 * @property {Object} guidedTourState
 * @property {boolean} isGuidedTourVisible
 * @property {boolean} isSkipped
 * @property {(step: string) => void} setCurrentStep
 * @property {(isVisible: boolean) => void} setGuidedTourVisibility
 * @property {(isSkipped: boolean) => void} setSkipped
 * @property {(step: string, state: { create: boolean; success: boolean }) => void} setStepState
 * @property {(section: string) => void} startSection
 */

/**
 * @preserve
 * @type {React.Context<GuidedTourContextValue>}
 */
const GuidedTourContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const GuidedTourProvider = ({
  children,
  currentStep,
  guidedTourState,
  isGuidedTourVisible,
  isSkipped,
  setCurrentStep,
  setGuidedTourVisibility,
  setSkipped,
  setStepState,
  startSection,
}) => {
  const value = React.useMemo(
    () => ({
      currentStep,
      guidedTourState,
      isGuidedTourVisible,
      isSkipped,
      setCurrentStep,
      setGuidedTourVisibility,
      setSkipped,
      setStepState,
      startSection,
    }),
    [
      currentStep,
      guidedTourState,
      isGuidedTourVisible,
      isSkipped,
      setCurrentStep,
      setGuidedTourVisibility,
      setSkipped,
      setStepState,
      startSection,
    ]
  );

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

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {GuidedTourContextValue}
 */
const useGuidedTour = () => React.useContext(GuidedTourContext);

export { GuidedTourProvider, useGuidedTour, GuidedTourContext };
