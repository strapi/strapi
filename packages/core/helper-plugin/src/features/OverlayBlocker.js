/* eslint-disable no-undef */
import * as React from 'react';

import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system';
import { createPortal } from 'react-dom';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} OverlayBlockerContextValue
 * @property {() => void} lockApp
 * @property {() => void} unlockApp
 */

/**
 * @preserve
 * @type {React.Context<OverlayBlockerContextValue>}
 */
const OverlayBlockerContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const OverlayBlockerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const lockApp = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const unlockApp = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextValue = React.useMemo(() => ({ lockApp, unlockApp }), [lockApp, unlockApp]);

  return (
    <OverlayBlockerContext.Provider value={contextValue}>
      {children}
      {isOpen && globalThis?.document?.body
        ? createPortal(<Overlay id="overlayBlocker" />, globalThis.document.body)
        : null}
    </OverlayBlockerContext.Provider>
  );
};

OverlayBlockerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const Overlay = styled(Box)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* TODO: set this up in the theme for consistence z-index values */
  z-index: 1140;
`;

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {OverlayBlockerContextValue}
 */
const useOverlayBlocker = () => React.useContext(OverlayBlockerContext);

export { OverlayBlockerProvider, useOverlayBlocker, OverlayBlockerContext };
