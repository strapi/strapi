/**
 *
 * OverlayBlocker
 * This component is used to prevent user interactions
 *
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Overlay from './Overlay';

const overlayContainer = document.createElement('div');
overlayContainer.setAttribute('id', 'overlayBlocker');

const OverlayBlocker = () => {
  const [isOpen, setIsOpen] = useState(false);

  const lockApp = () => {
    document.body.appendChild(overlayContainer);

    setIsOpen(true);
  };

  const unlockApp = () => {
    setIsOpen(false);

    if (document.getElementById('overlayBlocker')) {
      document.body.removeChild(overlayContainer);
    }
  };

  useEffect(() => {
    window.strapi = Object.assign(window.strapi || {}, {
      lockApp,
      unlockApp,
    });
  }, []);

  if (isOpen) {
    return ReactDOM.createPortal(<Overlay />, overlayContainer);
  }

  return null;
};

export default OverlayBlocker;
