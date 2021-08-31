/**
 *
 * OverlayBlockerProvider
 *
 */
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { OverlayBlockerContext } from '@strapi/helper-plugin';

const overlayContainer = document.createElement('div');
overlayContainer.setAttribute('id', 'overlayBlocker');

const Overlay = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1140;
`;

const Portal = ({ isOpen }) => {
  useEffect(() => {
    document.body.appendChild(overlayContainer);

    return () => {
      document.body.removeChild(overlayContainer);
    };
  }, []);

  if (isOpen) {
    return ReactDOM.createPortal(<Overlay />, overlayContainer);
  }

  return null;
};

const OverlayBlockerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const lockApp = () => {
    setIsOpen(true);
  };

  const unlockApp = () => {
    setIsOpen(false);
  };

  return (
    <OverlayBlockerContext.Provider value={{ lockApp, unlockApp }}>
      {children}
      <Portal isOpen={isOpen} />
    </OverlayBlockerContext.Provider>
  );
};

OverlayBlockerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default OverlayBlockerProvider;
