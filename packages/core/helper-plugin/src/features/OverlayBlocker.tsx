/* eslint-disable no-undef */
import * as React from 'react';

import { Box } from '@strapi/design-system';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface OverlayBlockerContextValue {
  lockApp?: () => void;
  unlockApp?: () => void;
}

const OverlayBlockerContext = React.createContext<OverlayBlockerContextValue>({});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface OverlayBlockerProviderProps {
  children: React.ReactNode;
}

const OverlayBlockerProvider = ({ children }: OverlayBlockerProviderProps) => {
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

const useOverlayBlocker = () => React.useContext(OverlayBlockerContext);

export { OverlayBlockerContext, OverlayBlockerProvider, useOverlayBlocker };
